/**
 * ORGINTEL server
 * Serves the app and provides the API behind it: accounts, organisations and teams,
 * data sync, automated collection (linked sheet + data API), automatic assessment,
 * and executive briefings. No required dependencies beyond Node itself.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

/* ---------- .env (optional) ---------- */
(function loadEnv() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
})();

const store = require('./server/store');
const sec = require('./server/security');
const mailer = require('./server/mailer');
const sync = require('./server/sync');
const assess = require('./server/assess');
const briefing = require('./server/briefing');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC = path.join(__dirname, 'public');   // everything the browser may load
const SESSION_DAYS = 14;
const COOKIE = 'orgintel_sid';
const ROLES = {
  cgo: 'Chief Governance Officer',
  analyst: 'Business Analyst',
  hr_manager: 'HR Manager',
  auditor: 'Compliance Auditor'
};
let shared = null;

/* ==========================================================================
   Small HTTP helpers
   ========================================================================== */
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };

function sendJson(res, status, body, headers = {}) {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(text);
}

function readJson(req, limit = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > limit) { reject(new HttpError(413, 'Request is too large.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { reject(new HttpError(400, 'Request body is not valid JSON.')); }
    });
    req.on('error', reject);
  });
}

const cookies = req => Object.fromEntries(String(req.headers.cookie || '').split(';').map(p => p.trim().split('=')).filter(p => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
const clientIp = req => req.socket.remoteAddress || 'unknown';

/** Browsers only: a state-changing request must come from this site and be JSON */
function checkSameOrigin(req) {
  const origin = req.headers.origin;
  if (origin) {
    let host = null;
    try { host = new URL(origin).host; } catch (e) { /* malformed */ }
    if (host !== req.headers.host) fail(403, 'Cross-site request refused.');
  }
  if (req.headers['content-length'] && Number(req.headers['content-length']) > 0 && !String(req.headers['content-type'] || '').includes('application/json')) {
    fail(415, 'Send JSON.');
  }
}

/* ==========================================================================
   Sessions and accounts
   ========================================================================== */
const loginLimiter = sec.createLimiter({ windowMs: 10 * 60 * 1000, max: 10 });
const signupLimiter = sec.createLimiter({ windowMs: 60 * 60 * 1000, max: 20 });
const ingestLimiter = sec.createLimiter({ windowMs: 60 * 1000, max: 60 });

function startSession(res, userId) {
  const token = sec.randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  store.db.sessions.push({ tokenHash: sec.sha256(token), userId, createdAt: new Date().toISOString(), expiresAt: expires.toISOString() });
  store.save();
  const secure = process.env.COOKIE_SECURE === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Expires=${expires.toUTCString()}${secure}`);
}
function endSession(req, res) {
  const token = cookies(req)[COOKIE];
  if (token) {
    const h = sec.sha256(token);
    store.db.sessions = store.db.sessions.filter(s => s.tokenHash !== h);
    store.save();
  }
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
}
function currentUser(req) {
  const token = cookies(req)[COOKIE];
  if (!token) return null;
  const h = sec.sha256(token);
  const session = store.db.sessions.find(s => s.tokenHash === h);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) { store.db.sessions = store.db.sessions.filter(s => s !== session); store.save(); return null; }
  return store.db.users.find(u => u.id === session.userId) || null;
}
const requireUser = req => currentUser(req) || fail(401, 'Sign in to continue.');

const membership = (org, userId) => (org.members || []).find(m => m.userId === userId) || null;
const orgsOf = userId => store.db.orgs.filter(o => membership(o, userId));
function requireOrg(req, orgId, roles = null) {
  const user = requireUser(req);
  const org = store.db.orgs.find(o => o.id === orgId);
  const member = org && membership(org, user.id);
  if (!member) fail(404, 'Organisation not found.');
  if (roles && !roles.includes(member.role)) fail(403, `Your role (${ROLES[member.role]}) cannot do this.`);
  return { user, org, member };
}

const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;

function newOrg({ name, sector, companySize, owner, role }) {
  const sectorObj = shared.SECTORS.find(s => s.id === sector) || shared.SECTORS[0];
  const now = new Date();
  return {
    id: `org-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'org'}-${sec.randomCode(5).toLowerCase()}`,
    name: String(name).trim().slice(0, 120),
    sector: sectorObj.id,
    sectorName: sectorObj.name,
    companySize: companySize || 'Mid-Market (251 - 1,000 employees)',
    creatorRole: ROLES[role] || ROLES.cgo,
    creatorName: owner.name,
    ownerUserId: owner.id,
    isDemo: false,
    createdQuarter: `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`,
    createdAt: now.toISOString(),
    departments: [],
    kpiFramework: JSON.parse(JSON.stringify(shared.BASE_KPI_CATALOG)),
    quarterlyData: {},
    policyDocs: [],
    rev: 1,
    members: [{ userId: owner.id, role: role in ROLES ? role : 'cgo', joinedAt: now.toISOString() }],
    automation: defaultAutomation()
  };
}
function defaultAutomation() {
  return {
    source: { url: '', intervalHours: 24, enabled: false, lastSyncAt: null, lastResult: null },
    apiKey: null,
    delivery: { recipients: [], webhookUrl: '', autoSend: true, aiNarrative: true },
    sent: {},
    syncLog: []
  };
}

/** What the browser is allowed to see of an organisation */
function clientOrg(org) {
  const { members, automation, ...visible } = org;
  return visible;
}
function clientUser(user) {
  const memberships = orgsOf(user.id).map(o => ({ tenantId: o.id, role: membership(o, user.id).role }));
  return { id: user.id, name: user.name, email: user.email, title: user.title || '', isDemo: false, memberships, tenantIds: memberships.map(m => m.tenantId) };
}
function stateFor(user) {
  if (!user) return { user: null, features: features() };
  const orgs = orgsOf(user.id);
  const ids = new Set(orgs.map(o => o.id));
  return {
    user: clientUser(user),
    roles: ROLES,
    tenants: orgs.map(clientOrg),
    actions: store.db.actions.filter(a => ids.has(a.tenantId)),
    auditLogs: store.db.audit.filter(a => ids.has(a.tenantId)).slice().reverse(),
    notifications: store.db.notifications.filter(n => ids.has(n.tenantId)),
    features: features()
  };
}
const features = () => ({ email: mailer.status().configured, ai: briefing.aiStatus().configured });

/* ==========================================================================
   State sync: the browser sends what it changed; the server decides what is allowed
   ========================================================================== */
const CAN_EDIT_DATA = ['cgo', 'analyst', 'hr_manager'];
const CAN_EDIT_FRAMEWORK = ['cgo', 'analyst'];
const CAN_EDIT_ACTIONS = ['cgo', 'hr_manager'];

function diffQuarters(before, after) {
  const changed = {};
  const quarters = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  quarters.forEach(q => {
    const a = (before || {})[q] || {}; const b = (after || {})[q] || {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let n = 0;
    keys.forEach(k => { if (a[k] !== b[k]) n++; });
    if (n) changed[q] = n;
  });
  return changed;
}

/** Keeps only quarter data that is well-formed and inside each measure's allowed range */
function cleanQuarterlyData(input, framework) {
  const out = {};
  const byId = new Map((framework || []).map(k => [k.id, k]));
  Object.entries(input || {}).forEach(([quarter, values]) => {
    if (!shared.isQuarterId(quarter) || !values || typeof values !== 'object') return;
    const row = {};
    Object.entries(values).forEach(([id, v]) => {
      const kpi = byId.get(id);
      if (!kpi) return;
      const check = shared.validateValue(kpi, v);
      if (check.ok) row[id] = check.value;
    });
    if (Object.keys(row).length) out[quarter] = row;
  });
  return out;
}

function cleanFramework(input, existing) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 200) return existing;
  const dims = new Set(shared.GOVERNANCE_DIMENSIONS.map(d => d.id));
  const out = input.filter(k => k && typeof k.id === 'string' && /^[a-z0-9_]{2,60}$/.test(k.id) && dims.has(k.dimension) && Number.isFinite(Number(k.target)))
    .map(k => ({
      id: k.id, name: String(k.name || k.id).slice(0, 120), dimension: k.dimension, unit: String(k.unit || '').slice(0, 20),
      target: Number(k.target), direction: k.direction === 'lower_is_better' ? 'lower_is_better' : 'higher_is_better',
      weight: Math.min(5, Math.max(0, Number(k.weight) || 0.2)),
      ...(Number.isFinite(Number(k.min)) ? { min: Number(k.min) } : {}), ...(Number.isFinite(Number(k.max)) ? { max: Number(k.max) } : {}),
      ...(k.sectorWeightMods && typeof k.sectorWeightMods === 'object' ? { sectorWeightMods: k.sectorWeightMods } : {}),
      ...(k.enabled === false ? { enabled: false } : {})
    }));
  return out.length ? out : existing;
}

async function applyState(user, body) {
  const db = store.db;
  const result = { revs: {}, conflicts: [], rejected: [] };
  const myOrgs = new Map(orgsOf(user.id).map(o => [o.id, o]));
  const roleIn = id => { const o = myOrgs.get(id); return o ? membership(o, user.id).role : null; };

  /* ---- organisations ---- */
  for (const t of Array.isArray(body.tenants) ? body.tenants.slice(0, 20) : []) {
    if (!t || typeof t.id !== 'string' || t.isDemo) continue;
    let org = myOrgs.get(t.id);
    if (!org) {
      // A second organisation created from inside the app
      if (db.orgs.some(o => o.id === t.id)) { result.rejected.push({ id: t.id, reason: 'not a member' }); continue; }
      if (myOrgs.size >= 10) { result.rejected.push({ id: t.id, reason: 'organisation limit reached' }); continue; }
      if (!t.name || !String(t.name).trim()) continue;
      org = newOrg({ name: t.name, sector: t.sector, companySize: t.companySize, owner: user, role: 'cgo' });
      org.id = /^org-[a-z0-9-]{3,80}$/.test(t.id) ? t.id : org.id;
      org.departments = Array.isArray(t.departments) ? t.departments.slice(0, 20).map(d => String(d).slice(0, 80)) : [];
      org.kpiFramework = cleanFramework(t.kpiFramework, org.kpiFramework);
      db.orgs.push(org); myOrgs.set(org.id, org);
      assess.appendAudit(org.id, { userName: user.name, userRole: ROLES.cgo, actionType: 'ORGANISATION_CREATED', summary: `Organisation created: ${org.name}`, details: `Sector: ${org.sectorName}` });
      result.revs[org.id] = org.rev;
      continue;
    }
    const role = roleIn(org.id);
    if (t.rev !== org.rev) { result.conflicts.push(org.id); continue; }

    let touched = false;
    if (CAN_EDIT_FRAMEWORK.includes(role)) {
      const fw = cleanFramework(t.kpiFramework, org.kpiFramework);
      if (JSON.stringify(fw) !== JSON.stringify(org.kpiFramework)) { org.kpiFramework = fw; touched = true; }
      if (Array.isArray(t.policyDocs)) {
        const docs = t.policyDocs.slice(0, 100).map(d => ({ id: String(d.id || '').slice(0, 20), title: String(d.title || '').slice(0, 160), category: String(d.category || 'Policy').slice(0, 40), sector: org.sectorName, snippet: String(d.snippet || '').slice(0, 400), fullText: String(d.fullText || '').slice(0, 20000), addedAt: d.addedAt || new Date().toISOString() }));
        if (JSON.stringify(docs) !== JSON.stringify(org.policyDocs || [])) { org.policyDocs = docs; touched = true; }
      }
      if (Array.isArray(t.departments)) {
        const deps = t.departments.slice(0, 20).map(d => String(d).slice(0, 80));
        if (JSON.stringify(deps) !== JSON.stringify(org.departments || [])) { org.departments = deps; touched = true; }
      }
    }
    let changed = {};
    if (CAN_EDIT_DATA.includes(role)) {
      const cleaned = cleanQuarterlyData(t.quarterlyData, org.kpiFramework);
      changed = diffQuarters(org.quarterlyData, cleaned);
      if (Object.keys(changed).length) org.quarterlyData = cleaned;
    }
    if (Object.keys(changed).length) {
      await assess.afterDataChange(org, changed, { userName: user.name, userRole: ROLES[role], via: 'the data pipeline' });   // bumps rev
    } else if (touched) {
      org.rev += 1; org.updatedAt = new Date().toISOString();
    }
    result.revs[org.id] = org.rev;
  }

  /* ---- actions ---- */
  for (const a of Array.isArray(body.actions) ? body.actions.slice(0, 500) : []) {
    if (!a || !myOrgs.has(a.tenantId) || typeof a.id !== 'string') continue;
    if (!CAN_EDIT_ACTIONS.includes(roleIn(a.tenantId))) continue;
    const clean = {
      id: a.id.slice(0, 30), tenantId: a.tenantId, quarter: shared.isQuarterId(a.quarter) ? a.quarter : null,
      dimension: String(a.dimension || 'operations').slice(0, 30), kpiId: a.kpiId ? String(a.kpiId).slice(0, 60) : null,
      title: String(a.title || '').slice(0, 200), owner: String(a.owner || 'Unassigned').slice(0, 120),
      priority: ['Critical', 'High', 'Medium'].includes(a.priority) ? a.priority : 'High',
      status: ['Draft', 'Approved', 'In Progress', 'Completed'].includes(a.status) ? a.status : 'Draft',
      targetDate: a.targetDate ? String(a.targetDate).slice(0, 10) : null,
      policyCitation: a.policyCitation ? String(a.policyCitation).slice(0, 200) : null,
      description: String(a.description || '').slice(0, 2000),
      projectedImpact: a.projectedImpact && typeof a.projectedImpact === 'object' ? { targetQuarter: a.projectedImpact.targetQuarter || null, kpiUpdates: a.projectedImpact.kpiUpdates || {}, ogpiImpact: String(a.projectedImpact.ogpiImpact || '').slice(0, 80) } : null,
      createdAt: a.createdAt || new Date().toISOString()
    };
    if (!clean.title || !clean.quarter) continue;
    const existing = db.actions.find(x => x.tenantId === clean.tenantId && x.id === clean.id);
    if (existing) {
      const outcome = existing.actualOutcome;   // verdicts are set by the server only
      const statusChanged = existing.status !== clean.status;
      Object.assign(existing, clean, { actualOutcome: outcome, createdAt: existing.createdAt });
      if (statusChanged) assess.verifyActions(myOrgs.get(clean.tenantId), [clean.quarter]);
    } else {
      db.actions.unshift({ ...clean, actualOutcome: null });
      assess.verifyActions(myOrgs.get(clean.tenantId), [clean.quarter]);
    }
  }

  /* ---- audit: append only. Who and when are stamped here, not taken from the browser ---- */
  const known = new Set(db.audit.map(e => `${e.tenantId}|${e.id}`));
  for (const e of Array.isArray(body.auditLogs) ? body.auditLogs.slice().reverse().slice(-200) : []) {
    if (!e || !myOrgs.has(e.tenantId) || !e.id || known.has(`${e.tenantId}|${e.id}`) || e.hash) continue;
    const rec = assess.appendAudit(e.tenantId, { id: String(e.id).slice(0, 30), userName: user.name, userRole: ROLES[roleIn(e.tenantId)], actionType: String(e.actionType || 'EVENT').slice(0, 60), summary: e.summary, details: e.details, severity: ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL'].includes(e.severity) ? e.severity : 'INFO' });
    known.add(`${rec.tenantId}|${rec.id}`);
  }

  /* ---- notifications: read state and locally raised alerts ---- */
  for (const n of Array.isArray(body.notifications) ? body.notifications.slice(0, 300) : []) {
    if (!n || !myOrgs.has(n.tenantId) || !n.id) continue;
    const existing = db.notifications.find(x => x.tenantId === n.tenantId && x.id === n.id);
    if (existing) { if (n.isRead) existing.isRead = true; }
    else db.notifications.unshift({ id: String(n.id).slice(0, 40), tenantId: n.tenantId, timestamp: String(n.timestamp || '').slice(0, 40), createdAt: new Date().toISOString(), title: String(n.title || '').slice(0, 200), message: String(n.message || '').slice(0, 1000), severity: String(n.severity || 'INFO').slice(0, 12), isRead: !!n.isRead, linkTab: String(n.linkTab || 'dashboard').slice(0, 30) });
  }

  store.save();
  return result;
}

/* ==========================================================================
   API routes
   ========================================================================== */
const routes = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, handler });
};

route('GET', '/api/state', async (req) => stateFor(currentUser(req)));

route('GET', '/api/version', async (req) => {
  const user = requireUser(req);
  return { revs: Object.fromEntries(orgsOf(user.id).map(o => [o.id, o.rev])), unread: store.db.notifications.filter(n => !n.isRead && orgsOf(user.id).some(o => o.id === n.tenantId)).length };
});

route('PUT', '/api/state', async (req) => {
  const user = requireUser(req);
  return applyState(user, await readJson(req));
});

route('POST', '/api/auth/signup', async (req, res) => {
  if (!signupLimiter(clientIp(req))) fail(429, 'Too many sign-ups from this address. Try again later.');
  const b = await readJson(req);
  const name = String(b.name || '').trim().slice(0, 120);
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!name) fail(400, 'Enter your name.');
  if (!validEmail(email)) fail(400, 'Enter a valid email address.');
  if (password.length < 8) fail(400, 'Choose a password of at least 8 characters.');
  if (password.length > 200) fail(400, 'That password is too long.');
  if (store.db.users.some(u => u.email === email)) fail(409, 'An account with this email already exists. Sign in instead.');

  const code = String(b.inviteCode || '').trim().toUpperCase();
  let invite = null;
  if (code) {
    invite = store.db.invites.find(i => i.code === code && !i.usedBy && new Date(i.expiresAt) > new Date());
    if (!invite || !store.db.orgs.some(o => o.id === invite.orgId)) fail(400, 'That invite code is not valid or has expired. Ask for a new one.');
  } else if (!String(b.organizationName || '').trim()) {
    fail(400, "Enter your organisation's name, or an invite code to join an existing one.");
  }

  const user = { id: sec.newId('usr'), name, email, title: String(b.title || '').trim().slice(0, 120), passwordHash: sec.hashPassword(password), createdAt: new Date().toISOString() };
  store.db.users.push(user);

  if (invite) {
    const org = store.db.orgs.find(o => o.id === invite.orgId);
    org.members.push({ userId: user.id, role: invite.role, joinedAt: new Date().toISOString(), invitedBy: invite.createdBy });
    invite.usedBy = user.id; invite.usedAt = new Date().toISOString();
    assess.appendAudit(org.id, { userName: user.name, userRole: ROLES[invite.role], actionType: 'MEMBER_JOINED', summary: `${user.name} joined as ${ROLES[invite.role]}`, details: `Invite ${invite.code}` });
  } else {
    const role = b.role in ROLES ? b.role : 'cgo';
    const org = newOrg({ name: b.organizationName, sector: b.sector, companySize: b.companySize, owner: user, role: 'cgo' });
    // Whoever creates the organisation administers it; their job title is kept as entered
    if (!user.title) user.title = ROLES[role];
    store.db.orgs.push(org);
    assess.appendAudit(org.id, { userName: user.name, userRole: ROLES.cgo, actionType: 'ORGANISATION_CREATED', summary: `Organisation created: ${org.name}`, details: `Sector: ${org.sectorName}` });
  }
  store.save();
  startSession(res, user.id);
  return stateFor(user);
});

route('POST', '/api/auth/login', async (req, res) => {
  const b = await readJson(req);
  const email = String(b.email || '').trim().toLowerCase();
  if (!loginLimiter(`${clientIp(req)}|${email}`)) fail(429, 'Too many attempts. Wait ten minutes and try again.');
  const user = store.db.users.find(u => u.email === email);
  // Hash even when the account does not exist, so timing does not reveal which emails are registered
  const ok = user ? sec.verifyPassword(String(b.password || ''), user.passwordHash) : (sec.verifyPassword('x', 'scrypt$00$00'), false);
  if (!ok) fail(401, 'That email and password do not match an account.');
  startSession(res, user.id);
  return stateFor(user);
});

route('POST', '/api/auth/logout', async (req, res) => { endSession(req, res); return { ok: true }; });

/* ---- team ---- */
route('GET', '/api/orgs/:id/team', async (req, _res, p) => {
  const { org, member, user } = requireOrg(req, p.id);
  const canManage = member.role === 'cgo';
  return {
    canManage,
    you: user.id,
    members: org.members.map(m => { const u = store.db.users.find(x => x.id === m.userId) || {}; return { userId: m.userId, name: u.name, email: u.email, title: u.title, role: m.role, roleName: ROLES[m.role], isOwner: org.ownerUserId === m.userId, joinedAt: m.joinedAt }; }),
    invites: canManage ? store.db.invites.filter(i => i.orgId === org.id && !i.usedBy && new Date(i.expiresAt) > new Date()).map(i => ({ code: i.code, role: i.role, roleName: ROLES[i.role], expiresAt: i.expiresAt })) : []
  };
});
route('POST', '/api/orgs/:id/invites', async (req, _res, p) => {
  const { org, user } = requireOrg(req, p.id, ['cgo']);
  const b = await readJson(req);
  if (!(b.role in ROLES)) fail(400, 'Choose a role for the invite.');
  if (store.db.invites.filter(i => i.orgId === org.id && !i.usedBy).length >= 25) fail(400, 'Too many open invites. Revoke some first.');
  const invite = { code: sec.randomCode(10), orgId: org.id, role: b.role, createdBy: user.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(), usedBy: null };
  store.db.invites.push(invite);
  assess.appendAudit(org.id, { userName: user.name, userRole: ROLES.cgo, actionType: 'INVITE_CREATED', summary: `Invite created for a ${ROLES[b.role]}`, details: `Expires ${invite.expiresAt.slice(0, 10)}` });
  store.save();
  return { code: invite.code, role: invite.role, roleName: ROLES[invite.role], expiresAt: invite.expiresAt };
});
route('DELETE', '/api/orgs/:id/invites/:code', async (req, _res, p) => {
  const { org } = requireOrg(req, p.id, ['cgo']);
  store.db.invites = store.db.invites.filter(i => !(i.orgId === org.id && i.code === p.code && !i.usedBy));
  store.save();
  return { ok: true };
});
route('PUT', '/api/orgs/:id/members/:userId', async (req, _res, p) => {
  const { org, user } = requireOrg(req, p.id, ['cgo']);
  const b = await readJson(req);
  const target = membership(org, p.userId) || fail(404, 'Member not found.');
  if (org.ownerUserId === p.userId) fail(400, "The owner's role cannot be changed.");
  if (!(b.role in ROLES)) fail(400, 'Unknown role.');
  target.role = b.role;
  assess.appendAudit(org.id, { userName: user.name, userRole: ROLES.cgo, actionType: 'MEMBER_ROLE_CHANGED', summary: `Role changed to ${ROLES[b.role]}`, details: `Member ${p.userId}` });
  store.save();
  return { ok: true };
});
route('DELETE', '/api/orgs/:id/members/:userId', async (req, _res, p) => {
  const { org, user } = requireOrg(req, p.id, ['cgo']);
  if (org.ownerUserId === p.userId) fail(400, 'The owner cannot be removed.');
  if (!membership(org, p.userId)) fail(404, 'Member not found.');
  org.members = org.members.filter(m => m.userId !== p.userId);
  assess.appendAudit(org.id, { userName: user.name, userRole: ROLES.cgo, actionType: 'MEMBER_REMOVED', summary: 'A member was removed', details: `Member ${p.userId}`, severity: 'WARNING' });
  store.save();
  return { ok: true };
});

/* ---- automation ---- */
function automationView(org) {
  const a = org.automation;
  const reported = shared.reportedQuarters(org);
  return {
    source: { url: a.source.url, intervalHours: a.source.intervalHours, enabled: a.source.enabled, lastSyncAt: a.source.lastSyncAt, lastResult: a.source.lastResult },
    syncLog: (a.syncLog || []).slice(0, 8).map(r => ({ ok: r.ok, at: r.at, changedCount: r.changedCount || 0, acceptedCount: r.acceptedCount || 0, errorCount: r.errorCount || 0, error: r.error || null })),
    apiKey: a.apiKey ? { exists: true, prefix: a.apiKey.prefix, createdAt: a.apiKey.createdAt, lastUsedAt: a.apiKey.lastUsedAt || null } : { exists: false },
    delivery: { recipients: a.delivery.recipients, webhookSet: !!a.delivery.webhookUrl, autoSend: a.delivery.autoSend !== false, aiNarrative: a.delivery.aiNarrative !== false },
    email: mailer.status(),
    ai: briefing.aiStatus(),
    reportedQuarters: reported,
    briefings: store.db.briefings.filter(b => b.tenantId === org.id).slice(0, 12).map(b => ({ id: b.id, quarterId: b.quarterId, createdAt: b.createdAt, trigger: b.trigger, subject: b.subject, score: b.score, status: b.status, summarySource: b.summarySource, deliveries: b.deliveries })),
    audit: assess.verifyAudit(org.id)
  };
}
route('GET', '/api/orgs/:id/automation', async (req, _res, p) => automationView(requireOrg(req, p.id).org));

route('PUT', '/api/orgs/:id/automation/source', async (req, _res, p) => {
  const { org, user, member } = requireOrg(req, p.id, ['cgo', 'analyst']);
  const b = await readJson(req);
  const url = String(b.url || '').trim();
  if (url && !sec.isAllowedSourceUrl(sync.normaliseSourceUrl(url))) fail(400, 'Use an https link to a Google Sheet, a OneDrive or SharePoint workbook, Dropbox, or a GitHub raw file.');
  org.automation.source.url = url.slice(0, 600);
  org.automation.source.intervalHours = [1, 6, 24, 168].includes(Number(b.intervalHours)) ? Number(b.intervalHours) : 24;
  org.automation.source.enabled = !!url && b.enabled !== false;
  assess.appendAudit(org.id, { userName: user.name, userRole: ROLES[member.role], actionType: 'DATA_SOURCE_UPDATED', summary: url ? 'Linked sheet set' : 'Linked sheet removed', details: url ? `Checks every ${org.automation.source.intervalHours} hours` : '' });
  store.save();
  return automationView(org);
});
route('POST', '/api/orgs/:id/automation/sync', async (req, _res, p) => {
  const { org, user, member } = requireOrg(req, p.id, CAN_EDIT_DATA);
  if (!org.automation.source.url) fail(400, 'Link a sheet first.');
  const result = await runSync(org, { userName: user.name, userRole: ROLES[member.role], via: 'the linked sheet (manual sync)' });
  return { result, automation: automationView(org) };
});
route('GET', '/api/orgs/:id/automation/template', async (req, res, p) => {
  const { org } = requireOrg(req, p.id);
  const now = new Date();
  let q = `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
  const reported = shared.reportedQuarters(org);
  const prev = q.endsWith('Q1') ? `${Number(q.slice(0, 4)) - 1}-Q4` : `${q.slice(0, 4)}-Q${Number(q.slice(6)) - 1}`;
  const quarters = [...new Set([...reported.slice(-3), prev, q])].sort();
  const csv = sync.sheetTemplate(org, quarters);
  res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="ORGINTEL_linked_sheet_${org.id}.csv"`, 'Cache-Control': 'no-store' });
  res.end(csv);
  return null;
});
route('POST', '/api/orgs/:id/automation/api-key', async (req, _res, p) => {
  const { org, user } = requireOrg(req, p.id, ['cgo']);
  const key = `ogk_${sec.randomToken(24)}`;
  org.automation.apiKey = { hash: sec.sha256(key), prefix: key.slice(0, 10), createdAt: new Date().toISOString(), lastUsedAt: null };
  assess.appendAudit(org.id, { userName: user.name, userRole: ROLES.cgo, actionType: 'API_KEY_CREATED', summary: 'Data API key created (replaces any earlier key)', details: `Key begins ${org.automation.apiKey.prefix}`, severity: 'WARNING' });
  store.save();
  return { key, automation: automationView(org) };   // shown once; only its hash is stored
});
route('DELETE', '/api/orgs/:id/automation/api-key', async (req, _res, p) => {
  const { org, user } = requireOrg(req, p.id, ['cgo']);
  org.automation.apiKey = null;
  assess.appendAudit(org.id, { userName: user.name, userRole: ROLES.cgo, actionType: 'API_KEY_REVOKED', summary: 'Data API key revoked', details: '', severity: 'WARNING' });
  store.save();
  return automationView(org);
});
route('PUT', '/api/orgs/:id/automation/delivery', async (req, _res, p) => {
  const { org, user } = requireOrg(req, p.id, ['cgo']);
  const b = await readJson(req);
  const recipients = (Array.isArray(b.recipients) ? b.recipients : String(b.recipients || '').split(/[,;\s]+/)).map(e => String(e).trim().toLowerCase()).filter(Boolean);
  const bad = recipients.find(e => !validEmail(e));
  if (bad) fail(400, `"${bad}" is not a valid email address.`);
  if (recipients.length > 20) fail(400, 'At most 20 recipients.');
  if (b.webhookUrl !== undefined) {
    const hook = String(b.webhookUrl || '').trim();
    if (hook && !sec.isSafeWebhookUrl(hook)) fail(400, 'The webhook must be a public https address.');
    org.automation.delivery.webhookUrl = hook.slice(0, 600);
  }
  org.automation.delivery.recipients = recipients;
  org.automation.delivery.autoSend = b.autoSend !== false;
  org.automation.delivery.aiNarrative = b.aiNarrative !== false;
  assess.appendAudit(org.id, { userName: user.name, userRole: ROLES.cgo, actionType: 'BRIEFING_DELIVERY_UPDATED', summary: `Briefing delivery updated: ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}`, details: org.automation.delivery.autoSend ? 'Automatic sending on' : 'Automatic sending off' });
  store.save();
  return automationView(org);
});
route('POST', '/api/orgs/:id/briefings', async (req, _res, p) => {
  const { org, user, member } = requireOrg(req, p.id, ['cgo', 'analyst']);
  const b = await readJson(req);
  const reported = shared.reportedQuarters(org);
  const quarterId = shared.isQuarterId(b.quarterId) ? b.quarterId : reported[reported.length - 1];
  if (!quarterId) fail(400, 'There is no reported quarter to brief on yet.');
  const record = await briefing.generate(org, quarterId, { trigger: 'manual', deliver: !!b.deliver, requestedBy: user.id });
  if (record.error) fail(400, record.error);
  assess.appendAudit(org.id, { userName: user.name, userRole: ROLES[member.role], actionType: 'BRIEFING_GENERATED', summary: `Briefing generated for ${quarterId}`, details: b.deliver ? `Delivered: ${record.deliveries.map(d => `${d.channel} ${d.ok ? 'ok' : 'failed'}`).join(', ') || 'no delivery channel set'}` : 'Not sent' });
  store.save();
  return { id: record.id, deliveries: record.deliveries, automation: automationView(org) };
});
route('GET', '/api/orgs/:id/briefings/:bid', async (req, _res, p) => {
  const { org } = requireOrg(req, p.id);
  const b = store.db.briefings.find(x => x.tenantId === org.id && x.id === p.bid) || fail(404, 'Briefing not found.');
  return { id: b.id, quarterId: b.quarterId, subject: b.subject, createdAt: b.createdAt, html: b.html, text: b.text, summarySource: b.summarySource, deliveries: b.deliveries };
});
route('GET', '/api/orgs/:id/audit/verify', async (req, _res, p) => assess.verifyAudit(requireOrg(req, p.id).org.id));

/* ---- data API for other systems (HR, finance, project tools): authenticated by organisation key ---- */
route('POST', '/api/ingest', async (req) => {
  if (!ingestLimiter(clientIp(req))) fail(429, 'Too many requests.');
  const header = String(req.headers.authorization || '');
  const key = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const hash = key ? sec.sha256(key) : null;
  const org = hash && store.db.orgs.find(o => o.automation.apiKey && o.automation.apiKey.hash === hash);
  if (!org) fail(401, 'Missing or invalid API key.');
  const b = await readJson(req, 512 * 1024);
  const input = b.data && typeof b.data === 'object' ? b.data : (b.quarter ? { [shared.parseQuarterLabel(b.quarter) || b.quarter]: b.values } : null);
  if (!input) fail(400, 'Send {"quarter": "2026-Q4", "values": {"hr_attrition": 9.1}} or {"data": {"2026-Q4": {...}}}.');

  const byId = new Map(org.kpiFramework.filter(k => k.enabled !== false).map(k => [k.id, k]));
  const accepted = {}; const rejected = [];
  Object.entries(input).forEach(([quarter, values]) => {
    if (!shared.isQuarterId(quarter)) { rejected.push({ quarter, reason: 'not a quarter id like 2026-Q4' }); return; }
    Object.entries(values || {}).forEach(([id, v]) => {
      const kpi = byId.get(id);
      if (!kpi) { rejected.push({ quarter, measure: id, reason: 'unknown measure id' }); return; }
      const check = shared.validateValue(kpi, v);
      if (check.ok) (accepted[quarter] = accepted[quarter] || {})[id] = check.value;
      else rejected.push({ quarter, measure: id, reason: check.missing ? 'empty value' : check.reason });
    });
  });
  const changed = sync.applyValues(org, accepted);
  org.automation.apiKey.lastUsedAt = new Date().toISOString();
  const outcome = await assess.afterDataChange(org, changed, { userName: 'Data API', userRole: 'Integration', via: 'the data API' });
  store.save();
  return { accepted: Object.fromEntries(Object.entries(accepted).map(([q, v]) => [q, Object.keys(v).length])), changed, rejected, briefingCreated: !!outcome.briefingId };
});

/* ==========================================================================
   Scheduler: linked sheets are checked on each organisation's interval
   ========================================================================== */
const running = new Set();
async function runSync(org, actor) {
  if (running.has(org.id)) return { ok: false, error: 'A sync is already running.' };
  running.add(org.id);
  try {
    const result = await sync.syncOrg(org);
    if (result.ok && result.changedCount) await assess.afterDataChange(org, result.changed, actor);
    store.save();
    return result;
  } finally { running.delete(org.id); }
}
async function schedulerTick() {
  for (const org of store.db.orgs) {
    const s = org.automation && org.automation.source;
    if (!s || !s.enabled || !s.url) continue;
    const due = !s.lastSyncAt || Date.now() - new Date(s.lastSyncAt).getTime() >= s.intervalHours * 3600000;
    if (due) {
      try { await runSync(org, { userName: 'Scheduled sync', userRole: 'Automated', via: 'the linked sheet' }); }
      catch (err) { console.error(`[scheduler] ${org.id}: ${err.message}`); }
    }
  }
}

/* ==========================================================================
   Static files: only the app itself is ever served
   ========================================================================== */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const ROOT_FILES = new Set(['landing.html', 'index.html', 'main.js', 'favicon.svg']);

function serveStatic(req, res) {
  let reqPath;
  try { reqPath = decodeURIComponent(req.url.split('?')[0]); } catch (e) { reqPath = '/'; }
  const clean = reqPath.toLowerCase().replace(/\/+$/, '');
  if (clean === '' || clean === '/landing') reqPath = '/landing.html';
  else if (clean === '/app' || clean === '/dashboard' || clean === '/index') reqPath = '/index.html';
  else if (clean === '/favicon.ico') reqPath = '/favicon.svg';

  const rel = path.posix.normalize(reqPath).replace(/^\/+/, '');
  const inFolders = /^modules\/[a-zA-Z0-9_.-]+\.(js|mjs)$/.test(rel) || /^css\/[a-zA-Z0-9_.-]+\.css$/.test(rel);
  if (!ROOT_FILES.has(rel) && !inFolders) return notFound(req, res);

  const filePath = path.join(PUBLIC, rel);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) return notFound(req, res);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' });
    fs.createReadStream(filePath).pipe(res);
  });
}
const NOT_FOUND_FALLBACK = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Page not found · ORGINTEL</title><style>body{background:#0a0d13;color:#e7ebf3;font-family:Arial,sans-serif;display:grid;place-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}a{color:#4c8dff}</style></head><body><h1>Page not found</h1><p><a href="/">Go to the home page</a></p></body></html>';
function notFound(req, res) {
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' };
  fs.readFile(path.join(PUBLIC, '404.html'), (err, page) => {
    res.writeHead(404, headers);
    res.end(err ? NOT_FOUND_FALLBACK : page);
  });
}

/* ==========================================================================
   Start
   ========================================================================== */
async function handle(req, res) {
  const url = req.url.split('?')[0];
  if (!url.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return serveStatic(req, res);
  }
  try {
    if (req.method !== 'GET') checkSameOrigin(req);
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = url.match(r.re);
      if (!m) continue;
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const out = await r.handler(req, res, params);
      if (out !== null && !res.writableEnded) sendJson(res, 200, out);
      return;
    }
    sendJson(res, 404, { error: 'Unknown API route.' });
  } catch (err) {
    if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message });
    console.error('[api]', req.method, url, err);
    if (!res.writableEnded) sendJson(res, 500, { error: 'Something went wrong on the server.' });
  }
}

async function main() {
  shared = await import('./public/modules/shared.mjs');
  store.load();
  // Organisations created by an earlier build may lack newer fields
  store.db.orgs.forEach(o => { o.automation = { ...defaultAutomation(), ...(o.automation || {}) }; o.members = o.members || []; o.rev = o.rev || 1; });
  sync.init(shared);
  briefing.init(shared);
  assess.init(shared, briefing);

  const server = http.createServer((req, res) => { handle(req, res); });
  server.listen(PORT, HOST, () => {
    const mail = mailer.status(); const ai = briefing.aiStatus();
    console.log('=======================================================');
    console.log(`ORGINTEL is running at http://localhost:${PORT}/`);
    console.log(`  App:            http://localhost:${PORT}/app`);
    console.log(`  Data file:      ${path.join(store.DATA_DIR, 'db.json')}`);
    console.log(`  Email delivery: ${mail.configured ? `on (from ${mail.from})` : `off - ${mail.reason}`}`);
    console.log(`  AI summaries:   ${ai.configured ? `on (${ai.provider})` : 'off - briefings use rule-based summaries'}`);
    console.log('=======================================================');
  });
  setInterval(() => { schedulerTick().catch(err => console.error('[scheduler]', err.message)); }, 60 * 1000).unref();
  setTimeout(() => { schedulerTick().catch(() => {}); }, 5000).unref();
}

main().catch(err => { console.error('ORGINTEL failed to start:', err); process.exit(1); });
