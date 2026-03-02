const sgMail = require('@sendgrid/mail');

const apiKey = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || process.env.EMAIL_USER;

if (!apiKey) {
  console.warn('⚠️ SENDGRID_API_KEY missing. Emails will fail.');
} else {
  sgMail.setApiKey(apiKey);
}

async function sendEmail(to, subject, text, html) {
  if (!apiKey) throw new Error('SENDGRID_API_KEY is not set');

  const msg = {
    to,
    from: { email: FROM_EMAIL, name: 'Legal Bridge' },
    subject,
    text: text || '',
    html: html || undefined,
  };

  return sgMail.send(msg);
}

module.exports = { sendEmail };