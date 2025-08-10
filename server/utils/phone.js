// server/utils/phone.js
function normalizeToE164IL(phone) {
    if (!phone) return null;
    let p = phone.replace(/[^\d+]/g, ''); // מסיר הכל חוץ מספרים ו+
    // אם מתחיל ב+ כבר בפורמט בינלאומי
    if (p.startsWith('+')) return p;
    // ישראל: מסירים 0 ראשון ומקדימים +972
    if (p.startsWith('0')) p = p.substring(1);
    return `+972${p}`;
  }
  
  module.exports = { normalizeToE164IL };
  