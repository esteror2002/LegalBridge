require('dotenv').config({ path: './server/.env' });
const express = require('express');
const cors = require('cors');
const connectDB = require('./database');
const path = require('path');

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
  console.log(`Server running on port ${PORT}`);
  console.log(`Static files served from: ${path.join(__dirname, '../client')}`);
  console.log(`Notifications system ready!`);
});
