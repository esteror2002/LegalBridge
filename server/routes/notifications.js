const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// קבלת התראות של משתמש
router.get('/user/:userId', notificationController.getUserNotifications);

// יצירת התראה חדשה
router.post('/', notificationController.createNotification);

// סימון התראה כנקראה
router.put('/:notificationId/read', notificationController.markAsRead);

// סימון כל ההתראות כנקראות
router.put('/user/:userId/read-all', notificationController.markAllAsRead);

// מחיקת התראה
router.delete('/:notificationId', notificationController.deleteNotification);

// סטטיסטיקות התראות
router.get('/user/:userId/stats', notificationController.getNotificationStats);

module.exports = router;