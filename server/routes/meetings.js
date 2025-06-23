const express = require('express');
const router = express.Router();
const videoMeetingsController = require('../controllers/videoMeetingsController');

// נתיבים לפגישות וידאו

// יצירת פגישה חדשה
router.post('/create', videoMeetingsController.createMeeting);

// שליפת פגישות פעילות (הקרובות)
router.get('/active', videoMeetingsController.getActiveMeetings);

// שליפת כל הפגישות
router.get('/all', videoMeetingsController.getAllMeetings);

// שליפת פגישות של היום
router.get('/today', async (req, res) => {
  try {
    const VideoMeeting = require('../models/VideoMeeting');
    const todaysMeetings = await VideoMeeting.findTodaysMeetings();
    res.json(todaysMeetings);
  } catch (error) {
    console.error('שגיאה בשליפת פגישות היום:', error);
    res.status(500).json({ message: 'שגיאה בשליפת פגישות היום' });
  }
});

// שליפת פגישות קרובות (7 ימים הקרובים)
router.get('/upcoming', async (req, res) => {
  try {
    const VideoMeeting = require('../models/VideoMeeting');
    const days = req.query.days || 7;
    const upcomingMeetings = await VideoMeeting.findUpcomingMeetings(parseInt(days));
    res.json(upcomingMeetings);
  } catch (error) {
    console.error('שגיאה בשליפת פגישות קרובות:', error);
    res.status(500).json({ message: 'שגיאה בשליפת פגישות קרובות' });
  }
});

// שליפת פגישות של לקוח ספציפי
router.get('/client/:clientId', async (req, res) => {
  try {
    const VideoMeeting = require('../models/VideoMeeting');
    const { clientId } = req.params;
    const clientMeetings = await VideoMeeting.findByClient(clientId);
    res.json(clientMeetings);
  } catch (error) {
    console.error('שגיאה בשליפת פגישות לקוח:', error);
    res.status(500).json({ message: 'שגיאה בשליפת פגישות הלקוח' });
  }
});

// שליפת פגישה ספציפית לפי ID
router.get('/:meetingId', async (req, res) => {
  try {
    const VideoMeeting = require('../models/VideoMeeting');
    const { meetingId } = req.params;
    
    const meeting = await VideoMeeting.findById(meetingId).populate('clientId', 'username email phone');
    if (!meeting) {
      return res.status(404).json({ message: 'פגישה לא נמצאה' });
    }
    
    res.json(meeting);
  } catch (error) {
    console.error('שגיאה בשליפת פגישה:', error);
    res.status(500).json({ message: 'שגיאה בשליפת הפגישה' });
  }
});

// עדכון סטטוס פגישה
router.put('/status/:meetingId', videoMeetingsController.updateMeetingStatus);

// ביטול פגישה
router.put('/cancel/:meetingId', videoMeetingsController.cancelMeeting);

// מחיקת פגישה
router.delete('/:meetingId', videoMeetingsController.deleteMeeting);

// הכנסה לפגישה (עדכון שהמשתמש נכנס)
router.post('/join/:meetingId', async (req, res) => {
  try {
    const VideoMeeting = require('../models/VideoMeeting');
    const { meetingId } = req.params;
    const { userType } = req.body; // 'client' או 'lawyer'
    
    const meeting = await VideoMeeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'פגישה לא נמצאה' });
    }
    
    // בדיקה אם ניתן להיכנס לפגישה
    if (!meeting.canJoin()) {
      return res.status(400).json({ 
        message: 'לא ניתן להיכנס לפגישה כעת. הפגישה עדיין לא התחילה או שכבר הסתיימה.' 
      });
    }
    
    // עדכון מי נכנס לפגישה
    if (userType === 'client') {
      meeting.joinedByClient = true;
    } else if (userType === 'lawyer') {
      meeting.joinedByLawyer = true;
    }
    
    // אם זו הפעם הראשונה שמישהו נכנס, עדכן לסטטוס "פעיל"
    if (meeting.status === 'scheduled' && (meeting.joinedByClient || meeting.joinedByLawyer)) {
      meeting.status = 'active';
      meeting.startedAt = new Date();
    }
    
    await meeting.save();
    
    res.json({ 
      message: 'נכנסת לפגישה בהצלחה',
      meeting: meeting,
      meetingUrl: meeting.meetingUrl
    });
    
  } catch (error) {
    console.error('שגיאה בכניסה לפגישה:', error);
    res.status(500).json({ message: 'שגיאה בכניסה לפגישה' });
  }
});

// סיום פגישה
router.post('/complete/:meetingId', async (req, res) => {
  try {
    const VideoMeeting = require('../models/VideoMeeting');
    const { meetingId } = req.params;
    const { duration, notes } = req.body; // משך בפועל והערות
    
    const meeting = await VideoMeeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'פגישה לא נמצאה' });
    }
    
    meeting.status = 'completed';
    meeting.completedAt = new Date();
    
    // עדכון הערות אם יש
    if (notes) {
      meeting.notes = notes;
    }
    
    await meeting.save();
    
    res.json({ message: 'הפגישה הושלמה בהצלחה', meeting });
    
  } catch (error) {
    console.error('שגיאה בסיום פגישה:', error);
    res.status(500).json({ message: 'שגיאה בסיום הפגישה' });
  }
});

// דוח פגישות (סטטיסטיקות)
router.get('/reports/statistics', async (req, res) => {
  try {
    const VideoMeeting = require('../models/VideoMeeting');
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        dateTime: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }
    
    const totalMeetings = await VideoMeeting.countDocuments(dateFilter);
    const completedMeetings = await VideoMeeting.countDocuments({
      ...dateFilter,
      status: 'completed'
    });
    const cancelledMeetings = await VideoMeeting.countDocuments({
      ...dateFilter,
      status: 'cancelled'
    });
    const scheduledMeetings = await VideoMeeting.countDocuments({
      ...dateFilter,
      status: 'scheduled'
    });
    
    const statistics = {
      totalMeetings,
      completedMeetings,
      cancelledMeetings,
      scheduledMeetings,
      completionRate: totalMeetings > 0 ? ((completedMeetings / totalMeetings) * 100).toFixed(2) : 0,
      cancellationRate: totalMeetings > 0 ? ((cancelledMeetings / totalMeetings) * 100).toFixed(2) : 0
    };
    
    res.json(statistics);
    
  } catch (error) {
    console.error('שגיאה בדוח סטטיסטיקות:', error);
    res.status(500).json({ message: 'שגיאה בהפקת הדוח' });
  }
});

// בדיקת זמינות לפגישה (האם השעה פנויה)
router.post('/check-availability', async (req, res) => {
  try {
    const VideoMeeting = require('../models/VideoMeeting');
    const { dateTime, duration = 60 } = req.body;
    
    const requestedStart = new Date(dateTime);
    const requestedEnd = new Date(requestedStart.getTime() + duration * 60000);
    
    // חיפוש פגישות חופפות
    const conflictingMeetings = await VideoMeeting.find({
      status: { $in: ['scheduled', 'active'] },
      $or: [
        {
          // פגישה מתחילה בזמן הבקשה
          dateTime: {
            $gte: requestedStart,
            $lt: requestedEnd
          }
        },
        {
          // פגישה מסתיימת בזמן הבקשה
          $and: [
            { dateTime: { $lt: requestedStart } },
            {
              $expr: {
                $gt: [
                  { $add: ['$dateTime', { $multiply: ['$duration', 60000] }] },
                  requestedStart
                ]
              }
            }
          ]
        }
      ]
    });
    
    const isAvailable = conflictingMeetings.length === 0;
    
    res.json({
      isAvailable,
      conflictingMeetings: isAvailable ? [] : conflictingMeetings,
      requestedTime: {
        start: requestedStart,
        end: requestedEnd,
        duration
      }
    });
    
  } catch (error) {
    console.error('שגיאה בבדיקת זמינות:', error);
    res.status(500).json({ message: 'שגיאה בבדיקת הזמינות' });
  }
});

// שליחת תזכורת ללקוח
router.post('/send-reminder/:meetingId', async (req, res) => {
  try {
    const VideoMeeting = require('../models/VideoMeeting');
    const { meetingId } = req.params;
    
    const meeting = await VideoMeeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'פגישה לא נמצאה' });
    }
    
    // שליחת תזכורת
    await sendMeetingReminderEmail(meeting);
    
    meeting.reminderSent = true;
    meeting.reminderSentAt = new Date();
    await meeting.save();
    
    res.json({ message: 'תזכורת נשלחה בהצלחה' });
    
  } catch (error) {
    console.error('שגיאה בשליחת תזכורת:', error);
    res.status(500).json({ message: 'שגיאה בשליחת התזכורת' });
  }
});

// פונקציה לשליחת תזכורת (צריך להוסיף לקונטרולר)
async function sendMeetingReminderEmail(meeting) {
  const nodemailer = require('nodemailer');
  
  let transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const meetingDate = new Date(meeting.dateTime);
  const formattedDate = meetingDate.toLocaleDateString('he-IL');
  const formattedTime = meetingDate.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const emailSubject = `תזכורת: פגישת וידאו מחר - ${meeting.title}`;
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; direction: rtl; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ffc107, #ff8f00); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">⏰ תזכורת פגישת וידאו</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Legal Bridge</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-bottom: 20px;">שלום ${meeting.clientName},</h2>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
          זוהי תזכורת לפגישת הוידאו שלך מחר:
        </p>
        
        <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin-bottom: 25px; border-right: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-bottom: 15px;">📋 פרטי הפגישה</h3>
          <p style="margin: 8px 0; color: #555;"><strong>נושא:</strong> ${meeting.title}</p>
          <p style="margin: 8px 0; color: #555;"><strong>תאריך:</strong> ${formattedDate}</p>
          <p style="margin: 8px 0; color: #555;"><strong>שעה:</strong> ${formattedTime}</p>
          <p style="margin: 8px 0; color: #555;"><strong>משך:</strong> ${meeting.duration} דקות</p>
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
            🎥 קישור לפגישה
          </a>
        </div>
        
        <p style="color: #666; text-align: center; font-size: 14px; margin-bottom: 0;">
          בברכה,<br>
          <strong>צוות Legal Bridge</strong>
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Legal Bridge" <${process.env.EMAIL_USER}>`,
    to: meeting.clientEmail,
    subject: emailSubject,
    html: emailHtml
  });
}

module.exports = router;