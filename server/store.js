/**
 * ORGINTEL server - data store
 * One JSON file on disk, written atomically. Small and dependency-free on purpose:
 * the rest of the server only talks to this module, so it can be swapped for a real
 * database (PostgreSQL, SQLite) without touching the API.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.ORGINTEL_DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'db.json');

const EMPTY = () => ({
  meta: { schema: 1, createdAt: new Date().toISOString() },
  users: [],        // { id, name, email, title, passwordHash, createdAt }
  sessions: [],     // { tokenHash, userId, createdAt, expiresAt }
  orgs: [],         // organisation record: client-visible fields + members + automation
  actions: [],      // corrective actions, each tagged with tenantId
  audit: [],        // hash-chained audit entries, each tagged with tenantId
  notifications: [],
  briefings: [],    // generated executive briefings
  invites: []       // { code, orgId, role, createdBy, createdAt, expiresAt, usedBy }
});

let db = EMPTY();
let timer = null;
let dirty = false;

function load() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(FILE)) {
    try {
      db = { ...EMPTY(), ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
    } catch (err) {
      // Never silently discard a database that failed to parse: keep it for inspection
      const aside = `${FILE}.unreadable-${Date.now()}`;
      fs.copyFileSync(FILE, aside);
      console.error(`[store] ${FILE} could not be read (${err.message}). A copy was kept at ${aside}. Starting empty.`);
      db = EMPTY();
    }
  }
  return db;
}

function flush() {
  if (!dirty) return;
  dirty = false;
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, FILE);
}

/** Call after any change. Writes are batched so a burst of edits is one disk write. */
function save() {
  dirty = true;
  if (timer) return;
  timer = setTimeout(() => { timer = null; try { flush(); } catch (err) { console.error('[store] write failed:', err.message); dirty = true; } }, 150);
}

process.on('exit', () => { try { flush(); } catch (e) { /* nothing more can be done */ } });
['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => process.exit(0)));

module.exports = { load, save, flush, get db() { return db; }, DATA_DIR };
