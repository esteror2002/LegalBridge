const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { sendVerification, checkVerification, SANDBOX } = require('../services/twilio');
const { normalizeToE164IL } = require('../utils/phone');


// פונקציית שליחת מייל
const sendEmail = async (to, subject, text) => {
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
    subject,
    text,
  });
};


// רישום משתמש
exports.register = async (req, res) => {
  try {
    const { username, email, password, role, phone, address } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: 'אנא מלא את כל השדות' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'שם המשתמש כבר רשום במערכת' });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'האימייל כבר רשום במערכת' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const cleanedUsername = username.trim().replace(/['"]+/g, '');
    const cleanedEmail = email.trim().toLowerCase();
    const cleanedPhone = (phone || '').trim();
    const cleanedAddress = (address || '').trim();

    const newUser = new User({
      username: cleanedUsername,
      email: cleanedEmail,
      password: hashedPassword,
      role,
      phone: cleanedPhone,
      phoneE164: cleanedPhone ? normalizeToE164IL(cleanedPhone) : null, // ⭐ חשוב ל‑SMS
      address: cleanedAddress,
      approved: false,
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '2d' });
    const approvalLink = `http://localhost:5000/api/auth/approve/${token}`;

    if (role === 'lawyer') {
      await sendEmail(
        'esteror2002@gmail.com',
        'משתמש חדש ממתין לאישור',
        `עורך דין חדש ממתין לאישור: ${cleanedUsername}\n\nלאישור:\n${approvalLink}`
      );
    } else if (role === 'client') {
      await sendEmail(
        'lawyer-email@example.com',
        'משתמש חדש ממתין לאישור',
        `לקוח חדש בשם ${cleanedUsername} ממתין לאישור.`
      );
    }

    return res.status(201).json({ message: 'נרשמת בהצלחה!' });
  } catch (error) {
    console.error('שגיאה בהרשמה:', error);
    return res.status(500).json({ message: 'שגיאה בשרת, נסה שוב מאוחר יותר' });
  }
};



// התחברות עם 2FA ב-SMS (חובה לכל CLIENT)
exports.login = async (req, res) => {
  try {
    const { username, password, twoFactorCode } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'אנא הזן שם משתמש וסיסמה' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'משתמש לא קיים במערכת' });
    if (!user.approved) return res.status(403).json({ message: 'ההרשמה שלך עדיין ממתינה לאישור מנהל' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'סיסמה שגויה' });

    // ===== דרישת 2FA לכל לקוח =====
    const mustDo2FA = (user.role === 'client');  // ← כל לקוח חייב 2FA
    if (mustDo2FA) {
      // ודא שיש מספר E.164
      if (!user.phoneE164 && user.phone) {
        user.phoneE164 = normalizeToE164IL(user.phone);
        await user.save();
      }
      if (!user.phoneE164) {
        return res.status(400).json({ message: 'אין מספר טלפון תקין לחשבון – אנא עדכן מספר באזור האישי' });
      }

      // אם אין קוד – שלח עכשיו קוד והחזר דרישה להזין
      if (!twoFactorCode) {
        await sendVerification(user.phoneE164);
        return res.status(200).json({
          message: 'נדרש אימות דו-שלבי (קוד נשלח ב-SMS)',
          requiresTwoFactor: true,
          method: 'sms',
          username: user.username
        });
      }

      // אימות הקוד
      const check = await checkVerification(user.phoneE164, twoFactorCode);
      if (!check || check.status !== 'approved') {
        return res.status(400).json({ message: 'קוד אימות שגוי או שפג תוקפו' });
      }

      // נסמן שה‑2FA פעיל ומאומת (פעם ראשונה)
      if (!user.twoFactorEnabled || user.twoFactorMethod !== 'sms' || !user.phoneVerified) {
        user.twoFactorEnabled = true;
        user.twoFactorMethod = 'sms';
        user.phoneVerified = true;
        await user.save();
      }
    }

    // ===== התחברות מלאה =====
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2d' }
    );

    return res.status(200).json({
      message: 'התחברת בהצלחה!',
      username: user.username,
      role: user.role,
      token,
      userId: user._id.toString()  
    });
    
  } catch (error) {
    console.error('שגיאה בשרת (login):', error);
    return res.status(500).json({ message: 'שגיאה בשרת, נסה שוב מאוחר יותר' });
  }
};



// אישור משתמש ע"י טוקן
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

// איפוס סיסמה (שליחת קישור למייל)
exports.forgotPassword = async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username || !email) {
      return res.status(400).json({ message: 'יש להזין שם משתמש ואימייל' });
    }

    const user = await User.findOne({
      username: username.trim(),
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(200).json({ message: 'אם הפרטים תואמים – נשלח קישור לאיפוס סיסמה' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const resetLink = `http://localhost:5000/reset-password?token=${token}`;

    await sendEmail(
      user.email,
      'איפוס סיסמה - Legal Bridge',
      `שלום ${user.username},\n\nבקשת איפוס סיסמה התקבלה.\n\nקישור:\n${resetLink}\n\nאם לא ביקשת – ניתן להתעלם מההודעה.`
    );

    res.status(200).json({ message: 'אם הפרטים נכונים – נשלח קישור לאיפוס סיסמה' });
  } catch (error) {
    console.error('שגיאה באיפוס סיסמה:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// איפוס בפועל (עם טוקן)
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) return res.status(400).json({ message: 'נא להזין סיסמה חדשה' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'הסיסמה אופסה בהצלחה!' });
  } catch (err) {
    console.error('שגיאה באיפוס סיסמה:', err);
    res.status(400).json({ message: 'קישור לא תקף או שפג תוקפו' });
  }
};

// משתמשים בהמתנה
exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'client', approved: false });
    res.status(200).json(users);
  } catch (err) {
    console.error('שגיאה בקבלת משתמשים ממתינים:', err);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// אישור משתמש לפי ID
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

// מחיקת משתמש
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

// שליפת לקוחות מאושרים
exports.getApprovedClients = async (req, res) => {
  try {
    const clients = await User.find({ role: 'client', approved: true }, 'username email phone address');
    res.json(clients);
  } catch (error) {
    console.error('שגיאה בקבלת לקוחות:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// עדכון פרופיל משתמש
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

// שליפת פרופיל לפי שם משתמש
exports.getProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });

    res.status(200).json({
      username: user.username,
      phone: user.phone,
      address: user.address,
      email: user.email,
    });
  } catch (error) {
    console.error('שגיאה בשליפת פרופיל:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};


//בדיקת סטטוס FA
exports.get2FAStatus = async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });

    res.json({
      twoFactorEnabled: user.twoFactorEnabled,
      backupCodesCount: user.twoFactorBackupCodes.length
    });
  } catch (error) {
    console.error('שגיאה בבדיקת סטטוס 2FA:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};


exports.setup2FA = async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });

    // יצירת סיקרט חדש
    const secret = speakeasy.generateSecret({
      name: `Legal Bridge (${user.username})`,
      issuer: 'Legal Bridge'
    });

    // שמירת הסיקרט זמנית (יאושר בשלב הבא)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // יצירת QR קוד
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });
  } catch (error) {
    console.error('שגיאה בהגדרת 2FA:', error);
    res.status(500).json({ message: 'שגיאה בהגדרת אימות דו-שלבי' });
  }
};


//  הפעלת 2FA - שלב 2: אימות והפעלה
exports.enable2FA = async (req, res) => {
  try {
    const { username } = req.params;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'נדרש קוד אימות' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });

    // אימות הקוד
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ message: 'קוד אימות שגוי' });
    }

    // הפעלת 2FA ויצירת קודי גיבוי
    user.twoFactorEnabled = true;
    const backupCodes = user.generateBackupCodes();
    await user.save();

    res.json({
      message: 'אימות דו-שלבי הופעל בהצלחה!',
      backupCodes
    });
  } catch (error) {
    console.error('שגיאה בהפעלת 2FA:', error);
    res.status(500).json({ message: 'שגיאה בהפעלת אימות דו-שלבי' });
  }
};

// שליחת קוד אימות ב-SMS
exports.sendSmsCode = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });

    // אם phoneE164 ריק – ננסה לנרמל את phone
    if (!user.phoneE164 && user.phone) {
      user.phoneE164 = normalizeToE164IL(user.phone);
      await user.save();
    }

    if (!user.phoneE164) return res.status(400).json({ message: 'אין למשתמש מספר טלפון מאומת' });

    const result = await sendVerification(user.phoneE164);
    const payload = { message: 'קוד נשלח', status: result.status };
    if (SANDBOX && result.code) payload.sandboxCode = result.code; // עוזר בבדיקות

    res.json(payload);
  } catch (e) {
    console.error('sendSmsCode error:', e);
    res.status(500).json({ message: 'שגיאה בשליחת קוד' });
  }
};

// אימות קוד מה-SMS והפעלת 2FA
exports.verifySmsCode = async (req, res) => {
  try {
    const { username } = req.params;
    const { code } = req.body;

    if (!code) return res.status(400).json({ message: 'נדרש קוד' });

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });
    if (!user.phoneE164 && user.phone) user.phoneE164 = normalizeToE164IL(user.phone);
    if (!user.phoneE164) return res.status(400).json({ message: 'אין מספר טלפון למשתמש' });

    const check = await checkVerification(user.phoneE164, code);
    if (check.status !== 'approved') {
      return res.status(400).json({ message: 'קוד שגוי או שפג תוקפו' });
    }

    user.twoFactorEnabled = true;
    user.twoFactorMethod = 'sms';
    user.phoneVerified = true;
    await user.save();

    res.json({ message: 'אומת בהצלחה' });
  } catch (e) {
    console.error('verifySmsCode error:', e);
    res.status(500).json({ message: 'שגיאה באימות קוד' });
  }
};


// טיפול בטופס צור קשר
exports.contactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // ולידציה בסיסית
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'אנא מלא את השדות החובה' });
    }

    // הכנת תוכן המייל
    const emailContent = `
הודעה חדשה מאתר Legal Bridge:

שם: ${name}
אימייל: ${email}
טלפון: ${phone || 'לא צוין'}
נושא: ${subject || 'כללי'}

הודעה:
${message}

---
נשלח מאתר Legal Bridge
    `.trim();

    // שליחת מייל אליך
    await sendEmail(
      'esteror2002@gmail.com',  // המייל שלך
      `הודעה חדשה מ-Legal Bridge: ${subject || 'צור קשר'}`,
      emailContent
    );


    return res.status(200).json({ 
      message: 'ההודעה נשלחה בהצלחה! נחזור אליך בהקדם.' 
    });

  } catch (error) {
    console.error('שגיאה בשליחת הודעת צור קשר:', error);
    return res.status(500).json({ 
      message: 'שגיאה בשליחת ההודעה, אנא נסה שוב מאוחר יותר' 
    });
  }
};