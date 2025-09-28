// stats.js
const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Case = require('../models/Case');
const Request = require('../models/Request');

router.get('/overview', async (req, res) => {
  try {
    // == ספירה עמידה של כל הלקוחות הרשומים ==
    const clientsCountFilter = {
      $expr: {
        $eq: [
          { $toLower: { $trim: { input: "$role" } } },
          "client"
        ]
      }
    };

    // ✅ ספירת תיקים פתוחים בלבד
    const openCasesFilter = {
      $or: [
        { status: 'פתוח' },
        { $expr: { $eq: [ { $toLower: { $trim: { input: "$status" } } }, 'open' ] } } // הגנה אם נשארו תיקים ישנים באנגלית
      ]
    };

    const [clientsCount, openCases, newMessages] = await Promise.all([
      User.countDocuments(clientsCountFilter),
      Case.countDocuments(openCasesFilter),
      Request.countDocuments({
        direction: 'incoming',
        read: false,
        status: 'open',
        archived: false,
        deleted: false
      })
    ]);

    res.json({ activeClients: clientsCount, openCases, newMessages, clientsCount });
  } catch (e) {
    console.error('stats/overview error:', e);
    res.status(500).json({ message: 'שגיאה בשליפת סטטיסטיקות' });
  }
});

// 🆕 סיכום יומי אמיתי - מבוסס על נתונים אמיתיים
router.get('/daily-summary', async (req, res) => {
  try {
    const Event = require('../models/Event');
    const Task = require('../models/Task');
    const TimeLog = require('../models/TimeLog');
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    // 1️⃣ זמן עבודה על תיקים - מהטיימרים (TimeLog)
    const caseTimeFromTimers = await TimeLog.aggregate([
      {
        $match: {
          activity: 'case',
          startedAt: { $gte: startOfDay, $lte: endOfDay },
          endedAt: { $ne: null },
          durationMin: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          totalMinutes: { $sum: '$durationMin' },
          sessions: { $sum: 1 }
        }
      }
    ]);


    // 2️⃣ זמן פגישות - מהיומן האישי (Event)
    const meetingEvents = await Event.find({
      date: todayStr,
      type: { $in: ['meeting', 'consultation'] },
      status: { $ne: 'cancelled' }
    });


    // חישוב זמן פגישות
    let meetingMinutes = 0;
    meetingEvents.forEach(event => {
      if (event.startTime && event.endTime) {
        const start = new Date(`2000-01-01T${event.startTime}:00`);
        const end = new Date(`2000-01-01T${event.endTime}:00`);
        const diffMs = end - start;
        const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
        meetingMinutes += diffMinutes;
      } else {
        // אם אין שעת סיום - ברירת מחדל 60 דקות
        meetingMinutes += 60;
      }
    });

    // 3️⃣ משימות שהושלמו היום
    const completedTasks = await Task.find({
      status: 'completed',
      completedAt: { $gte: startOfDay, $lte: endOfDay }
    });

    // 4️⃣ חישוב סיכומים
    const caseMinutes = caseTimeFromTimers[0]?.totalMinutes || 0;
    const caseSessions = caseTimeFromTimers[0]?.sessions || 0;
    const totalMinutes = caseMinutes + meetingMinutes;

    res.json({
      date: todayStr,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      
      // עבודה על תיקים (מטיימרים)
      casesWork: {
        totalMinutes: caseMinutes,
        totalHours: Math.round(caseMinutes / 60 * 10) / 10,
        sessions: caseSessions,
        source: 'timers'
      },
      
      // פגישות (מיומן)
      meetingsWork: {
        totalMinutes: meetingMinutes,
        totalHours: Math.round(meetingMinutes / 60 * 10) / 10,
        sessions: meetingEvents.length,
        source: 'calendar'
      },
      
      // משימות
      tasksWork: {
        completed: completedTasks.length,
        details: completedTasks.map(task => ({
          title: task.title,
          completedAt: task.completedAt,
          actualDuration: task.actualDuration
        }))
      },
      
      // נתונים לגרף
      chartData: [
        { label: 'עבודה על תיקים', value: caseMinutes, color: '#007bff' },
        { label: 'פגישות', value: meetingMinutes, color: '#28a745' }
      ]
    });

  } catch (error) {
    console.error('❌ Daily summary error:', error);
    
    // במקרה של שגיאה
    res.json({
      date: new Date().toISOString().split('T')[0],
      totalMinutes: 0,
      totalHours: 0,
      casesWork: { totalMinutes: 0, totalHours: 0, sessions: 0, source: 'timers' },
      meetingsWork: { totalMinutes: 0, totalHours: 0, sessions: 0, source: 'calendar' },
      tasksWork: { completed: 0, details: [] },
      chartData: [
        { label: 'עבודה על תיקים', value: 0, color: '#007bff' },
        { label: 'פגישות', value: 0, color: '#28a745' }
      ],
      error: error.message,
      message: 'בדקי שהטיימרים פועלים בעמודי התיקים ושיש אירועים ביומן'
    });
  }
});

// פונקציה לחישוב משך זמן מאירועים
function calculateEventsDuration(events) {
  let totalMinutes = 0;
  
  events.forEach(event => {
    if (event.startTime && event.endTime) {
      // יש שעת התחלה וסיום - נחשב בדיוק
      const start = new Date(`2000-01-01T${event.startTime}:00`);
      const end = new Date(`2000-01-01T${event.endTime}:00`);
      const diffMs = end - start;
      const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
      totalMinutes += diffMinutes;
    } else {
      // אין שעת סיום - ברירת מחדל לפי סוג האירוע
      switch (event.type) {
        case 'consultation': // ייעוץ
          totalMinutes += 60; // שעה
          break;
        case 'court': // בית משפט
          totalMinutes += 120; // שעתיים
          break;
        case 'meeting': // פגישה
          totalMinutes += 60; // שעה
          break;
        default:
          totalMinutes += 45; // 45 דקות ברירת מחדל
      }
    }
  });
  
  return totalMinutes;
}

// 🆕 API לקבלת סיכום יומי לפי משתמש ספציפי
router.get('/daily-summary/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const Event = require('../models/Event');
    const User = require('../models/User');
    
    // מציאת המשתמש
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // חישוב זמן עבודה על תיקים מיומן האישי
    const caseEvents = await Event.find({
      userId: user._id,
      date: todayStr,
      $or: [
        { type: 'consultation' }, // ייעוץ = עבודה על תיק
        { type: 'court' },        // בית משפט = עבודה על תיק
        { title: { $regex: 'תיק|משפט|ייעוץ|דין', $options: 'i' } }
      ],
      status: { $ne: 'cancelled' }
    });

    // חישוב זמן פגישות מיומן האישי  
    const meetingEvents = await Event.find({
      userId: user._id,
      date: todayStr,
      type: 'meeting',
      status: { $ne: 'cancelled' }
    });

    // חישוב זמן בפועל לכל סוג
    const caseMinutes = calculateEventsDuration(caseEvents);
    const meetingMinutes = calculateEventsDuration(meetingEvents);
    const totalMinutes = caseMinutes + meetingMinutes;

    res.json({
      date: todayStr,
      username,
      caseMinutes,
      meetingMinutes, 
      totalMinutes,
      caseHours: Math.round(caseMinutes / 60 * 10) / 10,
      meetingHours: Math.round(meetingMinutes / 60 * 10) / 10,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      caseCount: caseEvents.length,
      meetingCount: meetingEvents.length
    });

  } catch (error) {
    console.error('daily-summary by username error:', error);
    res.status(500).json({ message: 'שגיאה בשליפת סיכום יומי' });
  }
});
module.exports = router;
