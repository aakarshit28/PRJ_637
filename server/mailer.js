/**
 * ORGINTEL server - email delivery
 * Uses nodemailer when it is installed and SMTP_* settings are present in .env.
 * Without them the server still runs; briefings are generated and kept in the app, just not emailed.
 */
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) { /* optional dependency */ }

function settings() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true'
  };
}

function status() {
  const s = settings();
  if (!nodemailer) return { configured: false, reason: 'Run "npm install" to add the email library.' };
  if (!s.host || !s.from) return { configured: false, reason: 'Add SMTP_HOST and SMTP_FROM to the .env file.' };
  return { configured: true, from: s.from };
}

async function send({ to, subject, html, text }) {
  const st = status();
  if (!st.configured) return { ok: false, error: st.reason };
  const s = settings();
  try {
    const transport = nodemailer.createTransport({
      host: s.host, port: s.port, secure: s.secure,
      auth: s.user ? { user: s.user, pass: s.pass } : undefined,
      tls: process.env.SMTP_ALLOW_SELF_SIGNED === '1' ? { rejectUnauthorized: false } : undefined
    });
    const info = await transport.sendMail({ from: s.from, to: Array.isArray(to) ? to.join(', ') : to, subject, html, text });
    return { ok: true, id: info.messageId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { status, send };
