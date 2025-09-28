const VideoMeeting = require('../models/VideoMeeting');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// פונקציית שליחת מייל
const sendEmail = async (to, subject, text, html) => {
  let transporter = nodemailer.createTransport({ // createTransport לא createTransporter
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
    html: html || text,
  });
};

// יצירת פגישת וידאו חדשה
exports.createMeeting = async (req, res) => {
  try {
    let { clientId, title, dateTime, duration, notes, meetingId, meetingUrl } = req.body;

    // בדיקת שדות חובה
    if (!clientId || !title || !dateTime) {
      return res.status(400).json({ message: 'אנא מלא את כל השדות החובה' });
    }

    // יצירת meetingId אם לא קיים או null
    if (!meetingId || meetingId === 'null' || meetingId === null) {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const uniqueId = Math.floor(Math.random() * 10000);
      meetingId = `${timestamp}-${randomStr}-${uniqueId}`;
    }

    // יצירת URL אם לא קיים
    if (!meetingUrl) {
      meetingUrl = `https://meet.jit.si/legal-bridge-${meetingId}`;
    }

    // חיפוש הלקוח
    const client = await User.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'לקוח לא נמצא' });
    }


    // יצירת הפגישה
    const newMeeting = new VideoMeeting({
      clientId,
      clientName: client.username,
      clientEmail: client.email,
      clientPhone: client.phone,
      title,
      dateTime: new Date(dateTime),
      duration: duration || 60,
      notes: notes || '',
      meetingId,
      meetingUrl,
      status: 'scheduled',
      createdAt: new Date()
    });

    await newMeeting.save();

    // שליחת מייל ללקוח (אם נכשלת - לא נופל)
    try {
      await sendMeetingEmailToClient(client, newMeeting);
    } catch (emailError) {
      // ממשיכים למרות השגיאה במייל
    }

    res.status(201).json({
      message: 'הפגישה נוצרה בהצלחה! (המייל יישלח בנפרד)',
      meeting: newMeeting
    });

  } catch (error) {
    console.error('שגיאה ביצירת פגישה:', error);
    res.status(500).json({ message: 'שגיאה ביצירת הפגישה' });
  }
};

// שליחת מייל ללקוח עם פרטי הפגישה
async function sendMeetingEmailToClient(client, meeting) {
  const meetingDate = new Date(meeting.dateTime);
  const formattedDate = meetingDate.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = meetingDate.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const emailSubject = `הזמנה לפגישת וידאו - ${meeting.title}`;
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; direction: rtl; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">🎥 הזמנה לפגישת וידאו</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Legal Bridge - ייעוץ משפטי מקצועי</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-bottom: 20px;">שלום ${client.username},</h2>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
          נקבעה עבורך פגישת וידאו עם עורכת הדין. להלן פרטי הפגישה:
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
          <h3 style="color: #333; margin-bottom: 15px;">📋 פרטי הפגישה</h3>
          <p style="margin: 8px 0; color: #555;"><strong>נושא:</strong> ${meeting.title}</p>
          <p style="margin: 8px 0; color: #555;"><strong>תאריך:</strong> ${formattedDate}</p>
          <p style="margin: 8px 0; color: #555;"><strong>שעה:</strong> ${formattedTime}</p>
          <p style="margin: 8px 0; color: #555;"><strong>משך:</strong> ${meeting.duration} דקות</p>
          ${meeting.notes ? `<p style="margin: 8px 0; color: #555;"><strong>הערות:</strong> ${meeting.notes}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin-bottom: 25px;">
          <a href="${meeting.meetingUrl}" 
             style="background: linear-gradient(135deg, #28a745, #20c997); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
            🎥 הצטרף לפגישה כאן
          </a>
        </div>
        
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="color: #1976d2; margin-bottom: 10px;">💡 הוראות חשובות:</h4>
          <ul style="color: #555; margin: 0; padding-right: 20px;">
            <li>הקישור יעבוד רק בזמן הפגישה או סמוך אליו</li>
            <li>אין צורך להתקין תוכנה - הפגישה פועלת בדפדפן</li>
            <li>מומלץ לבדוק את המצלמה והמיקרופון מראש</li>
            <li>במידה ויש בעיה טכנית, צרו קשר מיד</li>
          </ul>
        </div>
        
        <p style="color: #666; text-align: center; font-size: 14px; margin-bottom: 0;">
          בברכה,<br>
          <strong>צוות Legal Bridge</strong><br>
          📧 ${process.env.EMAIL_USER} | 📞 לפניות דחופות
        </p>
      </div>
    </div>
  `;

  const emailText = `
שלום ${client.username},

נקבעה עבורך פגישת וידאו עם עורכת הדין.

פרטי הפגישה:
- נושא: ${meeting.title}
- תאריך: ${formattedDate}
- שעה: ${formattedTime}
- משך: ${meeting.duration} דקות
${meeting.notes ? `- הערות: ${meeting.notes}` : ''}

קישור לפגישה: ${meeting.meetingUrl}

הוראות חשובות:
- הקישור יעבוד רק בזמן הפגישה או סמוך אליו
- אין צורך להתקין תוכנה - הפגישה פועלת בדפדפן
- מומלץ לבדוק את המצלמה והמיקרופון מראש

בברכה,
צוות Legal Bridge
  `;

  await sendEmail(client.email, emailSubject, emailText, emailHtml);
}

// שליפת פגישות פעילות
exports.getActiveMeetings = async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const meetings = await VideoMeeting.find({
      dateTime: { 
        $gte: oneDayAgo,
        $lte: threeDaysFromNow 
      },
      status: { $in: ['scheduled', 'active'] }
    }).sort({ dateTime: 1 });

    res.json(meetings);
  } catch (error) {
    console.error('שגיאה בשליפת פגישות:', error);
    res.status(500).json({ message: 'שגיאה בשליפת הפגישות' });
  }
};

// שליפת כל הפגישות
exports.getAllMeetings = async (req, res) => {
  try {
    const meetings = await VideoMeeting.find().sort({ dateTime: -1 });
    res.json(meetings);
  } catch (error) {
    console.error('שגיאה בשליפת פגישות:', error);
    res.status(500).json({ message: 'שגיאה בשליפת הפגישות' });
  }
};

// ביטול פגישה
exports.cancelMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await VideoMeeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'פגישה לא נמצאה' });
    }

    meeting.status = 'cancelled';
    meeting.cancelledAt = new Date();
    await meeting.save();

    // שליחת הודעה ללקוח על ביטול
    await sendCancellationEmailToClient(meeting);

    res.json({ message: 'הפגישה בוטלה בהצלחה' });
  } catch (error) {
    console.error('שגיאה בביטול פגישה:', error);
    res.status(500).json({ message: 'שגיאה בביטול הפגישה' });
  }
};

// שליחת מייל ביטול ללקוח
async function sendCancellationEmailToClient(meeting) {
  const meetingDate = new Date(meeting.dateTime);
  const formattedDate = meetingDate.toLocaleDateString('he-IL');
  const formattedTime = meetingDate.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const emailSubject = `ביטול פגישת וידאו - ${meeting.title}`;
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; direction: rtl; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">❌ ביטול פגישת וידאו</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Legal Bridge</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-bottom: 20px;">שלום ${meeting.clientName},</h2>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
          מצטערים להודיע שהפגישה הבאה בוטלה:
        </p>
        
        <div style="background: #ffebee; padding: 20px; border-radius: 10px; margin-bottom: 25px; border-right: 4px solid #dc3545;">
          <h3 style="color: #d32f2f; margin-bottom: 15px;">פרטי הפגישה שבוטלה</h3>
          <p style="margin: 8px 0; color: #555;"><strong>נושא:</strong> ${meeting.title}</p>
          <p style="margin: 8px 0; color: #555;"><strong>תאריך:</strong> ${formattedDate}</p>
          <p style="margin: 8px 0; color: #555;"><strong>שעה:</strong> ${formattedTime}</p>
        </div>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          לתיאום פגישה חדשה, אנא צרו קשר בטלפון או באימייל.
        </p>
        
        <p style="color: #666; text-align: center; font-size: 14px; margin-bottom: 0;">
          בברכה,<br>
          <strong>צוות Legal Bridge</strong><br>
          📧 ${process.env.EMAIL_USER}
        </p>
      </div>
    </div>
  `;

  const emailText = `
שלום ${meeting.clientName},

מצטערים להודיע שהפגישה הבאה בוטלה:

- נושא: ${meeting.title}
- תאריך: ${formattedDate}
- שעה: ${formattedTime}

לתיאום פגישה חדשה, אנא צרו קשר.

בברכה,
צוות Legal Bridge
  `;

  await sendEmail(meeting.clientEmail, emailSubject, emailText, emailHtml);
}

// עדכון סטטוס פגישה
exports.updateMeetingStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status } = req.body;

    const meeting = await VideoMeeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'פגישה לא נמצאה' });
    }

    meeting.status = status;
    if (status === 'completed') {
      meeting.completedAt = new Date();
    }
    await meeting.save();

    res.json({ message: 'סטטוס הפגישה עודכן בהצלחה', meeting });
  } catch (error) {
    console.error('שגיאה בעדכון סטטוס:', error);
    res.status(500).json({ message: 'שגיאה בעדכון הסטטוס' });
  }
};

// מחיקת פגישה
exports.deleteMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await VideoMeeting.findByIdAndDelete(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'פגישה לא נמצאה' });
    }

    res.json({ message: 'הפגישה נמחקה בהצלחה' });
  } catch (error) {
    console.error('שגיאה במחיקת פגישה:', error);
    res.status(500).json({ message: 'שגיאה במחיקת הפגישה' });
  }
};