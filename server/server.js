require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./database');
const path = require('path');


const app = express();

// חיבור למסד הנתונים
connectDB();

// שימוש ב-CORS וב-JSON
app.use(cors());
app.use(express.json());

// נתיבים
app.use('/api/auth', require('./routes/auth'));
app.use('/api/requests', require('./routes/requests'));


app.get('/', (req, res) => {
    res.send('Legal Bridge API is running...');
});

app.use(express.static(path.join(__dirname, '../client')));


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
