require('dotenv').config({ path: './server/.env' });
const express = require('express');
const cors = require('cors');
const connectDB = require('./database');
const path = require('path');
const fs = require('fs');

const app = express();

/** ===== uploads dir + static ===== */
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

/** ===== DB ===== */
connectDB();

/** ===== CORS ===== */
app.use(cors({
  origin: [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    // הוסיפי כאן origin של ה-Client אם את מריצה על פורט אחר (למשל 3000)
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.options('*', cors());

/** ===== JSON ===== */
app.use(express.json());

/** ===== API routes ===== */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/cases', require('./routes/cases'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/meetings', require('./routes/meetings'));

/** ===== Client static ===== */
app.use(express.static(path.join(__dirname, '../client')));

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/reset-password.html'));
});

app.get('/', (req, res) => {
  res.send('Legal Bridge API is running...');
});

/** ===== Error handler (last) ===== */
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ message: 'שגיאה בשרת', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Static files served from: ${path.join(__dirname, '../client')}`);
  console.log(`🔔 Notifications system ready!`);
});
