/**
 * ORGINTEL server - passwords, tokens and request safety helpers
 */
const crypto = require('crypto');

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), expected.length, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

const sha256 = text => crypto.createHash('sha256').update(String(text)).digest('hex');
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const randomCode = (len = 10) => Array.from(crypto.randomBytes(len), b => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[b % 31]).join('');
const newId = prefix => `${prefix}-${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;

/** Simple fixed-window limiter, kept in memory: enough to blunt password guessing */
function createLimiter({ windowMs, max }) {
  const hits = new Map();
  return key => {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) { hits.set(key, { start: now, count: 1 }); return true; }
    entry.count += 1;
    if (hits.size > 5000) { for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k); }
    return entry.count <= max;
  };
}

/**
 * Outbound requests go only to https hosts on a short allowlist, so a linked "sheet" URL
 * can never be pointed at an internal address.
 */
const SOURCE_HOSTS = [
  /^docs\.google\.com$/i, /(^|\.)googleusercontent\.com$/i, /^drive\.google\.com$/i,
  /^onedrive\.live\.com$/i, /(^|\.)sharepoint\.com$/i, /^1drv\.ms$/i, /(^|\.)officeapps\.live\.com$/i,
  /^raw\.githubusercontent\.com$/i, /^gist\.githubusercontent\.com$/i,
  /(^|\.)dropboxusercontent\.com$/i, /^www\.dropbox\.com$/i
];
function isAllowedSourceUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (e) { return false; }
  if (process.env.ORGINTEL_ALLOW_LOCAL_SOURCES === '1' && ['localhost', '127.0.0.1'].includes(u.hostname)) return true;
  if (u.protocol !== 'https:') return false;
  return SOURCE_HOSTS.some(re => re.test(u.hostname));
}
/** Webhooks may go to any public https host, but never to a literal private or local address */
function isSafeWebhookUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (e) { return false; }
  if (u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h.includes(':')) return false;
  return true;
}

module.exports = { hashPassword, verifyPassword, sha256, randomToken, randomCode, newId, createLimiter, isAllowedSourceUrl, isSafeWebhookUrl };
