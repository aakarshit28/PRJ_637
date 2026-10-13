/**
 * ORGINTEL server - automated data collection
 * Reads a spreadsheet an organisation already keeps (published as CSV), validates every value
 * against the organisation's KPI framework, and stores only values that pass.
 */
const https = require('https');
const http = require('http');
const { isAllowedSourceUrl } = require('./security');

let shared = null;
const init = s => { shared = s; };

/** Turns an ordinary Google Sheets link into its CSV export address */
function normaliseSourceUrl(raw) {
  const url = String(raw || '').trim();
  const m = url.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/(edit|view|htmlview))?([^#]*)(?:#gid=(\d+))?/);
  if (m && !/\/(export|pub)\b/.test(url) && !url.includes('/d/e/')) {
    const gid = m[4] || (url.match(/[?&]gid=(\d+)/) || [])[1] || '0';
    return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
  }
  return url;
}

function fetchText(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    if (!isAllowedSourceUrl(url)) return reject(new Error('That address is not an allowed spreadsheet source. Use a Google Sheets, OneDrive/SharePoint, Dropbox or GitHub raw link over https.'));
    const lib = url.startsWith('http:') ? http : https;
    const req = lib.get(url, { headers: { 'User-Agent': 'ORGINTEL-sync/1.0', Accept: 'text/csv,text/plain,*/*' }, timeout: 15000 }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) return reject(new Error('Too many redirects.'));
        return resolve(fetchText(new URL(res.headers.location, url).toString(), redirectsLeft - 1));
      }
      if (res.statusCode === 401 || res.statusCode === 403) { res.resume(); return reject(new Error('The sheet is not shared publicly. Set it to "Anyone with the link can view", or use File > Share > Publish to web.')); }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`The sheet address returned HTTP ${res.statusCode}.`)); }
      const chunks = []; let size = 0;
      res.on('data', c => { size += c.length; if (size > 2 * 1024 * 1024) { req.destroy(new Error('The sheet is larger than 2 MB.')); } else chunks.push(c); });
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (/^\s*<(!doctype|html)/i.test(text)) return reject(new Error('The address returned a web page, not CSV. The sheet is probably not shared publicly: set it to "Anyone with the link can view".'));
        resolve(text);
      });
    });
    req.on('timeout', () => req.destroy(new Error('The sheet did not respond within 15 seconds.')));
    req.on('error', reject);
  });
}

/** Quote-aware CSV parser */
function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  const src = String(text).replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell.trim()); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Reads a sheet laid out as one row per measure and one column per quarter:
 *   KPI_ID, KPI_NAME, UNIT, TARGET, 2026-Q3, 2026-Q4, ...
 * Returns accepted values per quarter plus everything that was rejected and why.
 */
function readQuarterSheet(rows, framework) {
  if (!rows.length) return { error: 'The sheet is empty.' };
  // Title lines above the table are allowed: the header is the first opening row that names a quarter
  const quartersIn = row => row.map((h, i) => ({ i, quarter: shared.parseQuarterLabel(h) })).filter(c => c.quarter);
  const found = rows.slice(0, 20).findIndex(row => row.filter(c => c !== '').length >= 2 && quartersIn(row).length);
  const headerIndex = Math.max(0, found);
  const header = rows[headerIndex];
  const quarterCols = quartersIn(header);
  if (!quarterCols.length) return { error: 'No quarter columns found. Add one column per quarter with a heading like 2026-Q3.' };
  let idCol = header.findIndex(h => /^(kpi[\s_]*id|measure[\s_]*id|id)$/i.test(h));
  let nameCol = header.findIndex(h => /^(kpi[\s_]*name|measure|name|kpi)$/i.test(h));
  if (idCol < 0 && nameCol < 0) idCol = 0;

  const active = (framework || []).filter(k => k.enabled !== false);
  const byId = new Map(active.map(k => [norm(k.id), k]));
  const byName = new Map(active.map(k => [norm(k.name), k]));
  const accepted = {}; const errors = []; const unmatched = [];

  rows.slice(headerIndex + 1).forEach((row, r) => {
    const kpi = (idCol >= 0 && byId.get(norm(row[idCol]))) || (nameCol >= 0 && byName.get(norm(row[nameCol]))) || byId.get(norm(row[0])) || byName.get(norm(row[0]));
    if (!kpi) { const label = row[idCol >= 0 ? idCol : 0] || row[0]; if (label) unmatched.push(label); return; }
    quarterCols.forEach(col => {
      const check = shared.validateValue(kpi, row[col.i]);
      if (check.ok) { (accepted[col.quarter] = accepted[col.quarter] || {})[kpi.id] = check.value; }
      else if (!check.missing) errors.push({ row: headerIndex + r + 2, measure: kpi.name, quarter: col.quarter, reason: check.reason });
    });
  });
  return { accepted, errors, unmatched, quarters: quarterCols.map(c => c.quarter) };
}

/**
 * Merges accepted values into the organisation. Returns the quarters that actually changed.
 * A blank cell never erases a stored value.
 */
function applyValues(org, accepted) {
  const changed = {};
  org.quarterlyData = org.quarterlyData || {};
  Object.entries(accepted).forEach(([quarter, values]) => {
    const store = (org.quarterlyData[quarter] = org.quarterlyData[quarter] || {});
    let n = 0;
    Object.entries(values).forEach(([id, v]) => { if (store[id] !== v) { store[id] = v; n++; } });
    if (n) changed[quarter] = n;
    if (!Object.keys(store).length) delete org.quarterlyData[quarter];
  });
  return changed;
}

/** One full sync of an organisation's linked sheet */
async function syncOrg(org) {
  const source = org.automation.source;
  const startedAt = new Date().toISOString();
  let result;
  try {
    const text = await fetchText(normaliseSourceUrl(source.url));
    const parsed = readQuarterSheet(parseCsv(text), org.kpiFramework);
    if (parsed.error) throw new Error(parsed.error);
    const changed = applyValues(org, parsed.accepted);
    const acceptedCount = Object.values(parsed.accepted).reduce((n, q) => n + Object.keys(q).length, 0);
    result = {
      ok: true, at: startedAt,
      quartersFound: parsed.quarters, acceptedCount,
      changed, changedCount: Object.values(changed).reduce((a, b) => a + b, 0),
      errors: parsed.errors.slice(0, 25), errorCount: parsed.errors.length,
      unmatched: parsed.unmatched.slice(0, 15),
      message: acceptedCount === 0 ? 'The sheet was read, but no values matched your measures.' : null
    };
  } catch (err) {
    result = { ok: false, at: startedAt, error: err.message, changed: {}, changedCount: 0 };
  }
  source.lastSyncAt = startedAt;
  source.lastResult = result;
  org.automation.syncLog = [result, ...(org.automation.syncLog || [])].slice(0, 20);
  return result;
}

/** CSV an organisation can import into a new sheet: its measures down the side, recent quarters across */
function sheetTemplate(org, quarters) {
  const esc = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const head = ['KPI_ID', 'KPI_NAME', 'AREA', 'UNIT', 'TARGET', ...quarters];
  const lines = (org.kpiFramework || []).filter(k => k.enabled !== false).map(k =>
    [k.id, k.name, k.dimension, k.unit, k.target, ...quarters.map(q => ((org.quarterlyData || {})[q] || {})[k.id] ?? '')].map(esc).join(','));
  return [head.join(','), ...lines].join('\n');
}

module.exports = { init, normaliseSourceUrl, fetchText, parseCsv, readQuarterSheet, applyValues, syncOrg, sheetTemplate };
