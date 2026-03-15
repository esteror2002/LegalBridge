// ===== server/server.js =====
require('dotenv').config({ path: './server/.env' });
const express = require('express');
const cors = require('cors');
const connectDB = require('./database');
const path = require('path');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

/** ===== DB ===== */
connectDB();

/** ===== CORS ===== */
app.use(cors({ origin: true, credentials: true }));
app.options('*', cors({ origin: true, credentials: true }));

/** ===== JSON ===== */
app.use(express.json());

/** ===== API routes ===== */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/cases', require('./routes/cases'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/time', require('./routes/time'));


app.use('/api/ai', aiRoutes);


/** ===== Static client ===== */
app.use(express.static(path.join(process.cwd(), 'client')));

/** ===== Reset password page ===== */
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/reset-password.html'));
});

/** ===== Home ===== */
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client/index.html'));
});

/** ===== דפי בית נפרדים ללקוח ולעורכת דין ===== */

const sendPage = (res, page) => 
  res.sendFile(path.join(process.cwd(), `client/pages/${page}`));

// דפי לקוח
app.get(['/client-home', '/client-home.html'], (req, res) => sendPage(res, 'client-home.html'));
app.get(['/client-profile', '/client-profile.html'], (req, res) => sendPage(res, 'client-profile.html'));
app.get(['/client-case', '/client-case.html'], (req, res) => sendPage(res, 'client-case.html'));
app.get(['/client-requests', '/client-requests.html'], (req, res) => sendPage(res, 'client-requests.html'));
app.get(['/client-calendar', '/client-calendar.html'], (req, res) => sendPage(res, 'client-calendar.html'));

// עמוד עו"ד
app.get(['/lawyer-home', '/lawyer-home.html'], (req, res) => sendPage(res, 'lawyer-home.html'));





/** ===== עמוד שגיאה אם ההתחברות נכשלה ===== */
app.get('/login-failed', (req, res) => {
  res.status(401).send('<h2> ההתחברות נכשלה</h2><p>אנא נסי שוב.</p>');
});

/** ===== Error handler (last) ===== */
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ message: 'שגיאה בשרת', error: err.message });
});

// === ניקוי עדכונים לא חשובים פעם בשבוע ===
const cron = require('node-cron');
const Case = require('./models/Case');

// רשימת מילים שמסמנות שהעדכון לא חשוב
const NON_IMPORTANT_KEYWORDS = [
  'מסמך נמחק',
  'מסמך חדש הועלה',
  'הלקוח העלה את המסמך',
  'שויך לתת-תיק',
  'המסמך'
];

// ריצה כל יום ראשון בשעה 03:00 לפנות בוקר
cron.schedule('0 3 * * 0', async () => {
  console.log('🧹 מפנה עדכוני התקדמות לא חשובים...');

  try {
    const allCases = await Case.find();

    for (const c of allCases) {
      const before = c.progress.length;

      c.progress = c.progress.filter(p => {
        // בדיקה אם העדכון חשוב — אם כן נשמר
        return !NON_IMPORTANT_KEYWORDS.some(keyword =>
          (p.title || '').includes(keyword) ||
          (p.description || '').includes(keyword)
        );
      });

      // אם נמחקו עדכונים — שמירה למסד
      if (c.progress.length !== before) {
        await c.save();
        console.log(`נוקו ${before - c.progress.length} עדכונים בתיק ${c._id}`);
      }
    }

    console.log('✔ ניקוי שבועי הושלם!');
  } catch (e) {
    console.error(' שגיאה בניקוי עדכונים:', e);
  }
});


/** ===== Server ===== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Static files served from: ${path.join(__dirname, '../client')}`);
});
