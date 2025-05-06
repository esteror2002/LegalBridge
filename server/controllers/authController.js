const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

exports.register = async (req, res) => {
    try {
        const { username, email, password, role, phone, address } = req.body;

        if (!username || !email || !password || !role) {
            return res.status(400).json({ message: 'אנא מלא את כל השדות' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: 'שם המשתמש כבר רשום במערכת' });

        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ message: 'האימייל כבר רשום במערכת' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username: username.trim().replace(/['"]+/g, ''),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            role,
            phone: phone?.trim() || '',
            address: address?.trim() || '',
            approved: false
        });

        await newUser.save();
        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '2d' });
        const approvalLink = `http://localhost:5000/api/auth/approve/${token}`;

        if (role === 'lawyer') {
            await sendEmail('esteror2002@gmail.com', `עורך דין חדש ממתין לאישור: ${username}\n\nאשרי אותו כאן:\n${approvalLink}`);
        } else if (role === 'client') {
            await sendEmail('lawyer-email@example.com', `לקוח חדש ממתין לאישור: ${username}`);
        }

        res.status(201).json({ message: 'נרשמת בהצלחה!' });

    } catch (error) {
        console.error('שגיאה בהרשמה:', error);
        res.status(500).json({ message: 'שגיאה בשרת, נסה שוב מאוחר יותר' });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) return res.status(400).json({ message: 'אנא הזן שם משתמש וסיסמה' });

        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: 'משתמש לא קיים במערכת' });
        if (!user.approved) return res.status(403).json({ message: 'ההרשמה שלך עדיין ממתינה לאישור מנהל' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'סיסמה שגויה' });

        res.status(200).json({
            message: 'התחברת בהצלחה!',
            username: user.username,
            role: user.role
        });

    } catch (error) {
        console.error('שגיאה בשרת:', error);
        res.status(500).json({ message: 'שגיאה בשרת, נסה שוב מאוחר יותר' });
    }
};

exports.approveToken = async (req, res) => {
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
};

exports.getPendingUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'client', approved: false });
        res.status(200).json(users);
    } catch (err) {
        console.error('שגיאה בקבלת משתמשים ממתינים:', err);
        res.status(500).json({ message: 'שגיאה בשרת' });
    }
};

exports.approveUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });
        user.approved = true;
        await user.save();
        res.status(200).json({ message: 'המשתמש אושר בהצלחה' });
    } catch (err) {
        console.error('שגיאה באישור משתמש:', err);
        res.status(500).json({ message: 'שגיאה באישור המשתמש' });
    }
};

exports.deleteUserById = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });
        res.status(200).json({ message: 'המשתמש נמחק בהצלחה' });
    } catch (err) {
        console.error('שגיאה במחיקת משתמש:', err);
        res.status(500).json({ message: 'שגיאה במחיקת המשתמש' });
    }
};

exports.getApprovedClients = async (req, res) => {
    try {
        const clients = await User.find({ role: 'client', approved: true }, 'username email phone address');
        res.json(clients);
    } catch (error) {
        console.error('שגיאה בקבלת לקוחות:', error);
        res.status(500).json({ message: 'שגיאה בשרת' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { username, newName, newAddress, newEmail, newPhone } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });

        user.username = newName || user.username;
        user.address = newAddress || user.address;
        user.email = newEmail || user.email;
        user.phone = newPhone || user.phone;

        await user.save();
        res.status(200).json({ message: 'הפרטים עודכנו בהצלחה' });
    } catch (error) {
        console.error('שגיאה בעדכון פרופיל:', error);
        res.status(500).json({ message: 'שגיאה בעדכון המשתמש' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });

        res.status(200).json({
            username: user.username,
            phone: user.phone,
            address: user.address,
            email: user.email
        });
    } catch (error) {
        console.error('שגיאה בשליפת פרופיל:', error);
        res.status(500).json({ message: 'שגיאה בשרת' });
    }
};

// פונקציית שליחת מייל
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
