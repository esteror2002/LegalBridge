// server/services/twilio.js
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const verifySid  = process.env.TWILIO_VERIFY_SID;
const SANDBOX    = String(process.env.TWILIO_SANDBOX || '').toLowerCase() === 'true';

const client = (!SANDBOX && accountSid && authToken) ? twilio(accountSid, authToken) : null;

// מאגר קודים בזיכרון למצב Sandbox
const sandboxStore = new Map(); // key: phoneE164, value: { code, expiresAt }

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendVerification(to) {
  if (SANDBOX) {
    const code = generateCode();
    const expiresAt = Date.now() + 1000 * 60 * 5; // 5 דקות
    sandboxStore.set(to, { code, expiresAt });
    return { status: 'sent (sandbox)', to, code };
  }
  return client.verify.v2.services(verifySid).verifications.create({ to, channel: 'sms' });
}

async function checkVerification(to, code) {
  if (SANDBOX) {
    const rec = sandboxStore.get(to);
    const ok = rec && rec.code === String(code) && Date.now() <= rec.expiresAt;
    return { status: ok ? 'approved' : 'failed', to };
  }
  return client.verify.v2.services(verifySid).verificationChecks.create({ to, code });
}

module.exports = { sendVerification, checkVerification, SANDBOX };
