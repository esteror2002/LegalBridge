const Event = require('../models/Event');
const Task = require('../models/Task');
const User = require('../models/User');
const { createAutoNotification } = require('./notificationController');

// ==================== EVENTS ====================

// קבלת כל האירועים של המשתמש
exports.getAllEvents = async (req, res) => {
  try {
    const { username } = req.params;
    
    // מציאת המשתמש
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const events = await Event.find({ userId: user._id })
      .populate('relatedClientId', 'username email')
      .populate('relatedCaseId', 'clientName description')
      .sort({ date: 1, startTime: 1 });

    res.json(events);
  } catch (error) {
    console.error('שגיאה בקבלת אירועים:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// קבלת אירועים לתאריך ספציפי
exports.getEventsByDate = async (req, res) => {
  try {
    const { username, date } = req.params;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const events = await Event.getEventsForDate(user._id, date);
    res.json(events);
  } catch (error) {
    console.error('שגיאה בקבלת אירועים לתאריך:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// קבלת אירועים לתקופה
exports.getEventsByPeriod = async (req, res) => {
  try {
    const { username } = req.params;
    const { startDate, endDate } = req.query;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const events = await Event.getEventsForPeriod(user._id, startDate, endDate);
    res.json(events);
  } catch (error) {
    console.error('שגיאה בקבלת אירועים לתקופה:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// הוספת אירוע חדש
exports.addEvent = async (req, res) => {
  try {
    const { username } = req.params;
    const eventData = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    // וולידציה בסיסית
    if (!eventData.title || !eventData.date || !eventData.startTime) {
      return res.status(400).json({ message: 'חסרים שדות חובה' });
    }

    const newEvent = new Event({
      ...eventData,
      userId: user._id
    });

    await newEvent.save();

    // אם האירוע קשור ללקוח - שליחת התראה
    if (newEvent.relatedClientId) {
      try {
        await createAutoNotification(
          'meeting_scheduled',
          newEvent.relatedClientId,
          user._id,
          {
            eventTitle: newEvent.title,
            eventDate: newEvent.date,
            eventTime: newEvent.startTime
          }
        );
      } catch (notifError) {
        console.error('❌ שגיאה בשליחת התראה:', notifError);
      }
    }

    res.status(201).json(newEvent);
  } catch (error) {
    console.error('שגיאה בהוספת אירוע:', error);
    res.status(500).json({ message: 'שגיאה בהוספת אירוע' });
  }
};

// עדכון אירוע
exports.updateEvent = async (req, res) => {
  try {
    const { username, eventId } = req.params;
    const updateData = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const updatedEvent = await Event.findOneAndUpdate(
      { _id: eventId, userId: user._id },
      updateData,
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }

    res.json(updatedEvent);
  } catch (error) {
    console.error('שגיאה בעדכון אירוע:', error);
    res.status(500).json({ message: 'שגיאה בעדכון אירוע' });
  }
};

// מחיקת אירוע
exports.deleteEvent = async (req, res) => {
  try {
    const { username, eventId } = req.params;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const deletedEvent = await Event.findOneAndDelete({
      _id: eventId,
      userId: user._id
    });

    if (!deletedEvent) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }

    res.json({ message: 'אירוע נמחק בהצלחה' });
  } catch (error) {
    console.error('שגיאה במחיקת אירוע:', error);
    res.status(500).json({ message: 'שגיאה במחיקת אירוע' });
  }
};

// ==================== TASKS ====================

// קבלת כל המשימות
exports.getAllTasks = async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const tasks = await Task.find({ userId: user._id })
      .populate('relatedClientId', 'username email')
      .populate('relatedCaseId', 'clientName description')
      .sort({ dueDate: 1, priority: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('שגיאה בקבלת משימות:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// קבלת משימות לתאריך
exports.getTasksByDate = async (req, res) => {
  try {
    const { username, date } = req.params;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const tasks = await Task.getTasksForDate(user._id, date);
    res.json(tasks);
  } catch (error) {
    console.error('שגיאה בקבלת משימות לתאריך:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// קבלת משימות באיחור
exports.getOverdueTasks = async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const tasks = await Task.getOverdueTasks(user._id);
    res.json(tasks);
  } catch (error) {
    console.error('שגיאה בקבלת משימות באיחור:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// קבלת משימות קרובות
exports.getUpcomingTasks = async (req, res) => {
  try {
    const { username } = req.params;
    const { days = 7 } = req.query;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const tasks = await Task.getUpcomingTasks(user._id, parseInt(days));
    res.json(tasks);
  } catch (error) {
    console.error('שגיאה בקבלת משימות קרובות:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// הוספת משימה חדשה
exports.addTask = async (req, res) => {
  try {
    const { username } = req.params;
    const taskData = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    // וולידציה בסיסית
    if (!taskData.title || !taskData.dueDate) {
      return res.status(400).json({ message: 'חסרים שדות חובה' });
    }

    const newTask = new Task({
      ...taskData,
      userId: user._id
    });

    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    console.error('שגיאה בהוספת משימה:', error);
    res.status(500).json({ message: 'שגיאה בהוספת משימה' });
  }
};

// עדכון משימה
exports.updateTask = async (req, res) => {
  try {
    const { username, taskId } = req.params;
    const updateData = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, userId: user._id },
      updateData,
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: 'משימה לא נמצאה' });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('שגיאה בעדכון משימה:', error);
    res.status(500).json({ message: 'שגיאה בעדכון משימה' });
  }
};

// סימון משימה כהושלמה
exports.markTaskCompleted = async (req, res) => {
  try {
    const { username, taskId } = req.params;
    const { actualDuration } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const task = await Task.findOne({ _id: taskId, userId: user._id });
    if (!task) {
      return res.status(404).json({ message: 'משימה לא נמצאה' });
    }

    await task.markCompleted(actualDuration);
    res.json({ message: 'משימה סומנה כהושלמה', task });
  } catch (error) {
    console.error('שגיאה בסימון משימה כהושלמה:', error);
    res.status(500).json({ message: 'שגיאה בעדכון משימה' });
  }
};

// מחיקת משימה
exports.deleteTask = async (req, res) => {
  try {
    const { username, taskId } = req.params;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const deletedTask = await Task.findOneAndDelete({
      _id: taskId,
      userId: user._id
    });

    if (!deletedTask) {
      return res.status(404).json({ message: 'משימה לא נמצאה' });
    }

    res.json({ message: 'משימה נמחקה בהצלחה' });
  } catch (error) {
    console.error('שגיאה במחיקת משימה:', error);
    res.status(500).json({ message: 'שגיאה במחיקת משימה' });
  }
};

// ==================== ANALYTICS ====================

// קבלת נתונים לניתוח
exports.getAnalytics = async (req, res) => {
  try {
    const { username } = req.params;
    const { startDate, endDate } = req.query;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    // חיפוש אירועים ומשימות בטווח התאריכים
    const events = await Event.find({
      userId: user._id,
      date: { $gte: startDate, $lte: endDate }
    });

    const tasks = await Task.find({
      userId: user._id,
      dueDate: { $gte: startDate, $lte: endDate }
    });

    // חישוב סטטיסטיקות
    const analytics = {
      totalEvents: events.length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      overdueTasks: tasks.filter(t => t.isOverdue).length,
      eventsByType: {},
      tasksByCategory: {},
      averageMeetingsPerDay: 0,
      productivityScore: 0
    };

    // קיבוץ אירועים לפי סוג
    events.forEach(event => {
      analytics.eventsByType[event.type] = (analytics.eventsByType[event.type] || 0) + 1;
    });

    // קיבוץ משימות לפי קטגוריה
    tasks.forEach(task => {
      analytics.tasksByCategory[task.category] = (analytics.tasksByCategory[task.category] || 0) + 1;
    });

    // חישוב ממוצע פגישות ביום
    const daysDiff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    analytics.averageMeetingsPerDay = (events.length / daysDiff).toFixed(1);

    // חישוב ציון פרודוקטיביות (אחוז משימות שהושלמו)
    analytics.productivityScore = tasks.length > 0 
      ? Math.round((analytics.completedTasks / tasks.length) * 100)
      : 0;

    res.json(analytics);
  } catch (error) {
    console.error('שגיאה בקבלת נתונים לניתוח:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};