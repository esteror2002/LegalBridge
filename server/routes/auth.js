const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const router = express.Router();

// רישום משתמש חדש
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

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
            role,
        });

        // שמירת המשתמש בבסיס הנתונים
        await newUser.save();
        const token = jwt.sign(
            { userId: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '2d' }
          );
          
          const approvalLink = `http://localhost:5000/api/auth/approve/${token}`;

          if (role === 'lawyer') {
            await sendEmail(
                'esteror2002@gmail.com',
                `עורך דין חדש ממתינה לאישור: ${username}\n\nאשרי אות כאן:\n${approvalLink}`
            );
        }
        
        else if (role === 'client') {
            await sendEmail('lawyer-email@example.com', `לקוח חדש ממתין לאישור: ${username}`);
        }
        
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

        // console.log(`📩 קיבלתי ניסיון התחברות:`, req.body); 

        if (!username || !password) {
            return res.status(400).json({ message: 'אנא הזן שם משתמש וסיסמה' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'משתמש לא קיים במערכת' });
        }

        if (!user.approved) {
            return res.status(403).json({ message: 'ההרשמה שלך עדיין ממתינה לאישור מנהל' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'סיסמה שגויה' });
        }

        // console.log(`✅ התחברות מוצלחת למשתמש ${username}`); 

        res.status(200).json({ message: 'התחברת בהצלחה!' });

    } catch (error) {
        console.error('❌ שגיאה בשרת:', error);
        res.status(500).json({ message: 'שגיאה בשרת, נסה שוב מאוחר יותר' });
    }
});

const sendEmail = async (to, text) => {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: `"Legal Bridge" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'משתמש חדש ממתין לאישור',
        text,
    });
};

router.get('/approve/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) return res.status(404).send('המשתמש לא נמצא');
        if (user.approved) return res.send('המשתמש כבר אושר');

        user.approved = true;
        await user.save();

        res.send('המשתמש אושר בהצלחה!');
    } catch (err) {
        console.error('שגיאה באישור:', err);
        res.status(400).send('הקישור אינו תקף או שפג תוקפו');
    }
});



module.exports = router;
