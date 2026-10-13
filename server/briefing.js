/**
 * ORGINTEL server - executive briefing
 * Builds the briefing from the organisation's reported figures, optionally asks an AI model to
 * write the opening summary from those same figures, stores it, and delivers it.
 */
const https = require('https');
const store = require('./store');
const mailer = require('./mailer');
const { newId, isSafeWebhookUrl } = require('./security');

let shared = null;
const init = s => { shared = s; };

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const signed = n => (n > 0 ? '+' : n < 0 ? '-' : '') + Math.abs(n);
const COLOR = { green: '#178a63', amber: '#b7791f', red: '#c53b55', nodata: '#64748b' };

function postJson(url, payload, headers = {}, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', port: u.port || 443, timeout: timeoutMs,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('timeout', () => req.destroy(new Error('timed out')));
    req.on('error', reject);
    req.end(body);
  });
}

const aiStatus = () => process.env.GEMINI_API_KEY
  ? { configured: true, provider: 'Google Gemini' }
  : { configured: false, reason: 'Add GEMINI_API_KEY to the .env file to have the summary written by an AI model.' };

/** The summary paragraph, written by rule from the figures. Always available. */
function ruleSummary(brief, actions) {
  const parts = [];
  parts.push(`${brief.orgName} scored ${brief.score} out of 100 in ${brief.quarterId} (${brief.statusWord.toLowerCase()}).`);
  if (brief.delta === null) parts.push('This is the first reported quarter, so there is nothing earlier to compare with.');
  else if (Math.abs(brief.delta) < 1) parts.push(`That is level with ${brief.previousQuarterId}.`);
  else parts.push(`That is ${Math.abs(brief.delta)} points ${brief.delta > 0 ? 'higher' : 'lower'} than ${brief.previousQuarterId}.`);
  parts.push(brief.benchmarkGap >= 0 ? `It is ${brief.benchmarkGap} points above the ${shared.BENCHMARK} benchmark.` : `It is ${Math.abs(brief.benchmarkGap)} points below the ${shared.BENCHMARK} benchmark.`);
  if (brief.areas.length) parts.push(`The weakest area is ${brief.areas[0].name} at ${brief.areas[0].score}; the strongest is ${brief.areas[brief.areas.length - 1].name} at ${brief.areas[brief.areas.length - 1].score}.`);
  parts.push(brief.attentionCount ? `${brief.attentionCount} of ${brief.reportedCount} reported measures need attention.` : `All ${brief.reportedCount} reported measures are in the healthy band.`);
  if (brief.missingCount) parts.push(`${brief.missingCount} measure${brief.missingCount === 1 ? ' was' : 's were'} not reported and ${brief.missingCount === 1 ? 'is' : 'are'} left out of the score.`);
  const verified = actions.filter(a => a.actualOutcome && a.actualOutcome.automatic && a.actualOutcome.verifiedIn === brief.quarterId);
  if (verified.length) {
    const improved = verified.filter(a => a.actualOutcome.verdict === 'improved').length;
    parts.push(`${verified.length} earlier action${verified.length === 1 ? ' was' : 's were'} checked against this quarter's figures: ${improved} improved the measure targeted.`);
  }
  return parts.join(' ');
}

/** Asks the model to write the summary using only the figures supplied. Returns null on any failure. */
async function aiSummary(brief, actions) {
  if (!process.env.GEMINI_API_KEY) return null;
  const facts = {
    organisation: brief.orgName, quarter: brief.quarterId, previousQuarter: brief.previousQuarterId,
    overallScore: brief.score, status: brief.statusWord, changeSincePreviousQuarter: brief.delta, benchmark: shared.BENCHMARK,
    areas: brief.areas.map(a => ({ area: a.name, score: a.score, change: a.delta })),
    measuresNeedingAttention: brief.attention.map(k => ({ measure: k.name, value: k.value, target: k.target })),
    slippedThisQuarter: brief.newlyAtRisk, recoveredThisQuarter: brief.recovered,
    measuresNotReported: brief.missingCount,
    actionsVerifiedThisQuarter: actions.filter(a => a.actualOutcome && a.actualOutcome.verifiedIn === brief.quarterId).map(a => ({ action: a.title, verdict: a.actualOutcome.verdict, measure: a.actualOutcome.measure, before: a.actualOutcome.before, after: a.actualOutcome.after }))
  };
  const prompt = [
    'You are writing the opening summary of a quarterly governance briefing for a board of directors.',
    'Use ONLY the facts in the JSON below. Do not add figures, causes, names or recommendations that are not in it.',
    'Write 90 to 140 words of plain prose in one paragraph. No headings, no bullet points, no markdown.',
    'Say what the overall score is and how it moved, which area is weakest, what needs attention, and what earlier actions achieved if any were verified.',
    '', JSON.stringify(facts)
  ].join('\n');
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const res = await postJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 400 } },
      { 'x-goog-api-key': process.env.GEMINI_API_KEY });
    if (res.status !== 200) { console.warn(`[briefing] AI summary skipped: model returned HTTP ${res.status}`); return null; }
    const text = (((JSON.parse(res.body).candidates || [])[0] || {}).content || {}).parts;
    const out = text && text[0] && String(text[0].text || '').replace(/\s+/g, ' ').trim();
    return out && out.length > 60 ? out.slice(0, 1400) : null;
  } catch (err) {
    console.warn('[briefing] AI summary skipped:', err.message);
    return null;
  }
}

function renderHtml(brief, summary, source, actions) {
  const openActions = actions.filter(a => a.status !== 'Completed');
  const verified = actions.filter(a => a.actualOutcome && a.actualOutcome.verifiedIn === brief.quarterId);
  const row = cells => `<tr>${cells.map((c, i) => `<td style="padding:8px 10px;border-bottom:1px solid #e5e9f0;font-size:14px;color:#1f2937;${i ? 'text-align:right;white-space:nowrap;' : ''}">${c}</td>`).join('')}</tr>`;
  const h = t => `<h2 style="margin:28px 0 10px;font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:#475569;">${t}</h2>`;
  return `<!doctype html><html><body style="margin:0;background:#f3f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #e5e9f0;">
<tr><td style="padding:28px 32px 8px;">
  <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">Governance briefing &middot; ${esc(brief.quarterId)}</div>
  <h1 style="margin:8px 0 4px;font-size:24px;line-height:1.25;color:#0f172a;">${esc(brief.orgName)}</h1>
  <div style="font-size:17px;color:#0f172a;font-weight:bold;">${esc(brief.headline)}</div>
</td></tr>
<tr><td style="padding:8px 32px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0;"><tr>
    <td style="font-size:46px;font-weight:bold;color:${COLOR[brief.status]};padding-right:14px;line-height:1;">${brief.score}</td>
    <td style="font-size:14px;color:#475569;line-height:1.5;">out of 100 &middot; <strong style="color:${COLOR[brief.status]};">${esc(brief.statusWord)}</strong><br>
      ${brief.delta === null ? 'First reported quarter' : `${signed(brief.delta)} points since ${esc(brief.previousQuarterId)}`} &middot; ${signed(brief.benchmarkGap)} against the ${shared.BENCHMARK} benchmark</td>
  </tr></table>
  <p style="font-size:15px;line-height:1.6;color:#1f2937;margin:6px 0 4px;">${esc(summary)}</p>
  <p style="font-size:12px;color:#94a3b8;margin:0;">${source === 'ai' ? 'Summary written by an AI model from the figures in this briefing.' : 'Summary generated from the figures in this briefing.'}</p>
  ${h('Areas, weakest first')}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${brief.areas.map(a => row([esc(a.name), `<strong style="color:${COLOR[a.status]};">${a.score}</strong>`, a.delta === null ? '' : `${signed(a.delta)}`])).join('')}</table>
  ${brief.attention.length ? h(`Measures needing attention (${brief.attentionCount})`) + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${brief.attention.map(k => row([esc(k.name), `<strong style="color:${COLOR[k.status]};">${esc(k.value)}</strong>`, `target ${esc(k.target)}`])).join('')}</table>` : ''}
  ${verified.length ? h('Earlier actions, checked against this quarter') + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${verified.map(a => row([`${esc(a.title)}<br><span style="font-size:12px;color:#64748b;">${esc(a.actualOutcome.measure)}: ${esc(a.actualOutcome.before)} to ${esc(a.actualOutcome.after)}</span>`, `<strong style="color:${a.actualOutcome.verdict === 'improved' ? COLOR.green : a.actualOutcome.verdict === 'worsened' ? COLOR.red : '#64748b'};">${esc(a.actualOutcome.verdict)}</strong>`])).join('')}</table>` : ''}
  ${openActions.length ? h(`Open actions (${openActions.length})`) + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${openActions.slice(0, 8).map(a => row([esc(a.title), esc(a.owner || ''), esc(a.status)])).join('')}</table>` : ''}
</td></tr>
<tr><td style="padding:24px 32px 28px;font-size:12px;color:#94a3b8;line-height:1.5;">
  ${brief.reportedCount} measures reported${brief.missingCount ? `, ${brief.missingCount} not reported` : ''}. Generated automatically by ORGINTEL when this quarter's figures arrived.
</td></tr></table></td></tr></table></body></html>`;
}

function renderText(brief, summary) {
  return [
    `${brief.orgName} - governance briefing, ${brief.quarterId}`,
    brief.headline, '',
    summary, '',
    'Areas, weakest first:',
    ...brief.areas.map(a => `  ${a.name}: ${a.score}${a.delta === null ? '' : ` (${signed(a.delta)})`}`),
    ...(brief.attention.length ? ['', 'Measures needing attention:', ...brief.attention.map(k => `  ${k.name}: ${k.value} (target ${k.target})`)] : [])
  ].join('\n');
}

async function generate(org, quarterId, { trigger = 'manual', deliver = false, requestedBy = null } = {}) {
  const brief = shared.buildBrief(org, quarterId);
  if (!brief.hasData) return { error: `No figures have been reported for ${quarterId}.` };
  const actions = store.db.actions.filter(a => a.tenantId === org.id);
  const useAi = org.automation.delivery.aiNarrative !== false;
  const ai = useAi ? await aiSummary(brief, actions) : null;
  const summary = ai || ruleSummary(brief, actions);
  const source = ai ? 'ai' : 'rules';
  const record = {
    id: newId('BRF'), tenantId: org.id, quarterId, trigger, requestedBy,
    createdAt: new Date().toISOString(),
    subject: `${org.name}: ${brief.headline} (${quarterId})`,
    headline: brief.headline, score: brief.score, status: brief.status, summary, summarySource: source,
    html: renderHtml(brief, summary, source, actions), text: renderText(brief, summary),
    deliveries: []
  };

  if (deliver) {
    const delivery = org.automation.delivery;
    const recipients = (delivery.recipients || []).filter(Boolean);
    if (recipients.length) {
      const sent = await mailer.send({ to: recipients, subject: record.subject, html: record.html, text: record.text });
      record.deliveries.push({ channel: 'email', to: recipients, ok: sent.ok, detail: sent.ok ? 'Sent' : sent.error, at: new Date().toISOString() });
    }
    if (delivery.webhookUrl && isSafeWebhookUrl(delivery.webhookUrl)) {
      try {
        const res = await postJson(delivery.webhookUrl, { text: `*${record.subject}*\n${summary}` });
        record.deliveries.push({ channel: 'webhook', ok: res.status >= 200 && res.status < 300, detail: `HTTP ${res.status}`, at: new Date().toISOString() });
      } catch (err) {
        record.deliveries.push({ channel: 'webhook', ok: false, detail: err.message, at: new Date().toISOString() });
      }
    }
  }

  const db = store.db;
  db.briefings.unshift(record);
  const mine = db.briefings.filter(b => b.tenantId === org.id);
  if (mine.length > 30) { const drop = new Set(mine.slice(30).map(b => b.id)); db.briefings = db.briefings.filter(b => !drop.has(b.id)); }
  store.save();
  return record;
}

module.exports = { init, generate, aiStatus };
