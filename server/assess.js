/**
 * ORGINTEL server - automatic assessment
 * Runs whenever an organisation's figures change, however they arrived (linked sheet, data API,
 * upload or manual entry): writes the audit entry, raises alerts, verifies earlier actions against
 * the new period, and triggers the executive briefing.
 */
const store = require('./store');
const { sha256, newId } = require('./security');

let shared = null;
let briefing = null;
const init = (s, b) => { shared = s; briefing = b; };

/* ---------- Tamper-evident audit trail: each entry carries the hash of the one before it ---------- */
const auditBody = e => JSON.stringify([e.id, e.timestamp, e.tenantId, e.userName, e.userRole, e.actionType, e.summary, e.details, e.severity]);

function appendAudit(tenantId, entry) {
  const db = store.db;
  const last = [...db.audit].reverse().find(e => e.tenantId === tenantId);
  const record = {
    id: entry.id || `AUD-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    timestamp: new Date().toISOString(),   // always the server's clock
    tenantId,
    userName: entry.userName || 'System',
    userRole: entry.userRole || 'Automated',
    actionType: entry.actionType,
    summary: String(entry.summary || '').slice(0, 500),
    details: String(entry.details || '').slice(0, 2000),
    severity: entry.severity || 'INFO',
    prevHash: last ? last.hash : 'GENESIS'
  };
  record.hash = sha256(record.prevHash + auditBody(record));
  db.audit.push(record);
  return record;
}

function verifyAudit(tenantId) {
  const chain = store.db.audit.filter(e => e.tenantId === tenantId);
  let prev = 'GENESIS';
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    if (e.prevHash !== prev || e.hash !== sha256(e.prevHash + auditBody(e))) {
      return { intact: false, entries: chain.length, brokenAt: e.id, position: i + 1 };
    }
    prev = e.hash;
  }
  return { intact: true, entries: chain.length, lastHash: chain.length ? prev : null };
}

function notify(tenantId, { title, message, severity = 'INFO', linkTab = 'dashboard' }) {
  const db = store.db;
  if (db.notifications.some(n => n.tenantId === tenantId && !n.isRead && n.title === title && n.message === message)) return null;
  const n = { id: newId('NOTIF'), tenantId, timestamp: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), createdAt: new Date().toISOString(), title, message, severity, isRead: false, linkTab };
  db.notifications.unshift(n);
  const mine = db.notifications.filter(x => x.tenantId === tenantId);
  if (mine.length > 100) { const drop = new Set(mine.slice(100).map(x => x.id)); db.notifications = db.notifications.filter(x => !drop.has(x.id)); }
  return n;
}

/**
 * Closed loop, automated: once the quarter after an action has been reported, compare the measure
 * the action targeted (or its whole area) before and after, and record the verdict on the action.
 */
function verifyActions(org, touchedQuarters) {
  const reported = shared.reportedQuarters(org);
  const results = [];
  store.db.actions.filter(a => a.tenantId === org.id && a.status !== 'Draft').forEach(action => {
    if (!reported.includes(action.quarter)) return;
    const after = reported.find(q => q > action.quarter);
    if (!after) return;
    const already = action.actualOutcome && action.actualOutcome.verifiedIn === after;
    if (already && !touchedQuarters.includes(after) && !touchedQuarters.includes(action.quarter)) return;

    const pre = shared.scoreQuarter(org.kpiFramework, org.quarterlyData[action.quarter], org.sector);
    const post = shared.scoreQuarter(org.kpiFramework, org.quarterlyData[after], org.sector);
    let measure, before, afterVal, scoreDelta;
    const kpiId = action.kpiId || Object.keys((action.projectedImpact && action.projectedImpact.kpiUpdates) || {})[0];
    if (kpiId && pre.kpis[kpiId] && post.kpis[kpiId]) {
      const a = pre.kpis[kpiId], b = post.kpis[kpiId];
      measure = a.name; before = shared.formatValue(a.rawVal, a.unit); afterVal = shared.formatValue(b.rawVal, b.unit);
      scoreDelta = Math.round((b.score - a.score) * 10) / 10;
    } else if (pre.dimensions[action.dimension] && pre.dimensions[action.dimension].hasData && post.dimensions[action.dimension] && post.dimensions[action.dimension].hasData) {
      const a = pre.dimensions[action.dimension], b = post.dimensions[action.dimension];
      measure = `${shared.shortDimension(a.name)} score`; before = String(a.score); afterVal = String(b.score);
      scoreDelta = Math.round((b.score - a.score) * 10) / 10;
    } else return;

    const verdict = scoreDelta >= 2 ? 'improved' : scoreDelta <= -2 ? 'worsened' : 'unchanged';
    const changedVerdict = !action.actualOutcome || action.actualOutcome.verdict !== verdict || action.actualOutcome.verifiedIn !== after;
    action.actualOutcome = { verdict, verifiedIn: after, measure, before, after: afterVal, scoreDelta, checkedAt: new Date().toISOString(), automatic: true };
    if (changedVerdict) {
      results.push(action);
      notify(org.id, {
        title: `Action ${action.id} checked against ${after}: ${verdict}`,
        message: `${action.title}. ${measure} went from ${before} to ${afterVal}.`,
        severity: verdict === 'improved' ? 'SUCCESS' : verdict === 'worsened' ? 'WARNING' : 'INFO',
        linkTab: 'action-board'
      });
    }
  });
  return results;
}

/**
 * @param org            organisation record (already updated)
 * @param changed        { quarterId: numberOfValuesChanged }
 * @param actor          { userName, userRole, via } describing how the data arrived
 */
async function afterDataChange(org, changed, actor) {
  const quarters = Object.keys(changed);
  if (!quarters.length) return { quarters: [] };
  org.rev = (org.rev || 0) + 1;
  org.updatedAt = new Date().toISOString();
  const total = Object.values(changed).reduce((a, b) => a + b, 0);

  appendAudit(org.id, {
    userName: actor.userName, userRole: actor.userRole,
    actionType: 'DATA_UPDATED',
    summary: `${total} value${total === 1 ? '' : 's'} updated for ${quarters.sort().join(', ')} via ${actor.via}`,
    details: quarters.map(q => `${q}: ${changed[q]} changed`).join('; '),
    severity: 'SUCCESS'
  });

  const reported = shared.reportedQuarters(org);
  const latest = reported[reported.length - 1];
  let brief = null;
  if (latest && quarters.includes(latest)) {
    brief = shared.buildBrief(org, latest);
    if (brief.hasData) {
      notify(org.id, {
        title: `${latest}: ${brief.headline}`,
        message: `${brief.statusWord}. ${brief.attentionCount} of ${brief.reportedCount} measures need attention` + (brief.areas.length ? `; weakest area is ${brief.areas[0].name} at ${brief.areas[0].score}.` : '.'),
        severity: brief.status === 'red' ? 'CRITICAL' : brief.status === 'amber' ? 'WARNING' : 'SUCCESS',
        linkTab: 'dashboard'
      });
      if (brief.newlyAtRisk.length) {
        notify(org.id, {
          title: `${brief.newlyAtRisk.length} measure${brief.newlyAtRisk.length === 1 ? '' : 's'} slipped out of the healthy band in ${latest}`,
          message: brief.newlyAtRisk.slice(0, 5).map(m => `${m.name}: ${m.before} to ${m.after}`).join('; '),
          severity: 'WARNING',
          linkTab: 'ai-rag'
        });
      }
    }
  }

  const verified = verifyActions(org, quarters);

  // Executive briefing: once per quarter, the first time that quarter is complete enough to report on
  let sentBriefing = null;
  const delivery = org.automation.delivery;
  org.automation.sent = org.automation.sent || {};
  if (brief && brief.hasData && delivery.autoSend !== false && !org.automation.sent[latest]) {
    const expected = brief.reportedCount + brief.missingCount;
    const enabledAreas = new Set((org.kpiFramework || []).filter(k => k.enabled !== false).map(k => k.dimension)).size;
    const complete = brief.reportedCount / Math.max(1, expected) >= 0.6 && brief.areas.length >= enabledAreas;
    if (complete) {
      sentBriefing = await briefing.generate(org, latest, { trigger: 'automatic', deliver: true });
      org.automation.sent[latest] = sentBriefing.id;
    }
  }

  store.save();
  return { quarters, latest, verifiedActions: verified.map(a => a.id), briefingId: sentBriefing ? sentBriefing.id : null };
}

module.exports = { init, appendAudit, verifyAudit, notify, verifyActions, afterDataChange };
