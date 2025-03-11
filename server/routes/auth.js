const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

// רישום משתמש חדש
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // בדיקה אם כל השדות מולאו
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'אנא מלא את כל השדות' });
        }

        // בדיקה אם המשתמש כבר קיים
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'שם המשתמש כבר רשום במערכת' });
        }

        // בדיקה אם האימייל כבר רשום
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: 'האימייל כבר רשום במערכת' });
        }

        // הצפנת סיסמה
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // יצירת משתמש חדש
        const newUser = new User({
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
        });

        // שמירת המשתמש בבסיס הנתונים
        await newUser.save();
        res.status(201).json({ message: 'נרשמת בהצלחה!' });

    } catch (error) {
        console.error('שגיאה בהרשמה:', error);
        res.status(500).json({ message: 'שגיאה בשרת, נסה שוב מאוחר יותר' });
    }
});

// התחברות משתמש קיים
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log(`📩 קיבלתי ניסיון התחברות:`, req.body); // ✅ לוודא שהשרת מקבל נתונים

        if (!username || !password) {
            return res.status(400).json({ message: 'אנא הזן שם משתמש וסיסמה' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'משתמש לא קיים במערכת' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'סיסמה שגויה' });
        }

        console.log(`✅ התחברות מוצלחת למשתמש ${username}`); // ✅ לראות שהכל עובד

        res.status(200).json({ message: 'התחברת בהצלחה!' });

    } catch (error) {
        console.error('❌ שגיאה בשרת:', error);
        res.status(500).json({ message: 'שגיאה בשרת, נסה שוב מאוחר יותר' });
    }
});


module.exports = router;
