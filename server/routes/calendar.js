const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');

// ==================== EVENTS ROUTES ====================

// קבלת כל האירועים של המשתמש
router.get('/:username/events', calendarController.getAllEvents);

// קבלת אירועים לתאריך ספציפי
router.get('/:username/events/date/:date', calendarController.getEventsByDate);

// קבלת אירועים לתקופה (עם query parameters: startDate, endDate)
router.get('/:username/events/period', calendarController.getEventsByPeriod);

// הוספת אירוע חדש
router.post('/:username/events', calendarController.addEvent);

// עדכון אירוע
router.put('/:username/events/:eventId', calendarController.updateEvent);

// מחיקת אירוע
router.delete('/:username/events/:eventId', calendarController.deleteEvent);

// ==================== TASKS ROUTES ====================

// קבלת כל המשימות של המשתמש
router.get('/:username/tasks', calendarController.getAllTasks);

// קבלת משימות לתאריך ספציפי
router.get('/:username/tasks/date/:date', calendarController.getTasksByDate);

// קבלת משימות באיחור
router.get('/:username/tasks/overdue', calendarController.getOverdueTasks);

// קבלת משימות קרובות (עם query parameter: days)
router.get('/:username/tasks/upcoming', calendarController.getUpcomingTasks);

// הוספת משימה חדשה
router.post('/:username/tasks', calendarController.addTask);

// עדכון משימה
router.put('/:username/tasks/:taskId', calendarController.updateTask);

// סימון משימה כהושלמה
router.put('/:username/tasks/:taskId/complete', calendarController.markTaskCompleted);

// מחיקת משימה
router.delete('/:username/tasks/:taskId', calendarController.deleteTask);

// ==================== ANALYTICS ROUTES ====================

// קבלת נתונים לניתוח (עם query parameters: startDate, endDate)
router.get('/:username/analytics', calendarController.getAnalytics);

module.exports = router;