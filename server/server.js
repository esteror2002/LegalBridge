require('dotenv').config({ path: './server/.env' });
const express = require('express');
const cors = require('cors');
const connectDB = require('./database');
const path = require('path');

const app = express();

// חיבור למסד הנתונים
connectDB();

// CORS מתוקן
app.use(cors({
  origin: ['http://localhost:5000', 'http://127.0.0.1:5000', 'file://'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight requests
app.options('*', cors());

// שימוש ב-JSON
app.use(express.json());

// נתיבים
app.use('/api/auth', require('./routes/auth'));  
app.use('/api/requests', require('./routes/requests'));
app.use('/api/cases', require('./routes/cases'));
app.use('/api/notifications', require('./routes/notifications'));

// סטטיק קבצים
app.use(express.static(path.join(__dirname, '../client')));

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/pages/reset-password.html'));
});

app.get('/', (req, res) => {
    res.send('Legal Bridge API is running...');
});

// Error handling middleware
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