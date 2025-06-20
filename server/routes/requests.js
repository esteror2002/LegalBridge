const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');

// פניות - בסיסי
router.post('/send', requestController.sendRequest);
router.get('/', requestController.getAllRequests);
router.get('/my/:username', requestController.getRequestsByUser);

// תגובות וטיפול בפניות
router.post('/reply/:id', requestController.replyToRequest);
router.post('/close/:id', requestController.closeRequest);
router.post('/archive/:id', requestController.archiveRequest);
router.post('/unarchive/:id', requestController.unarchiveRequest);

// מערכת דואר 
router.post('/send-to-client', requestController.sendToClient); // עורך דין שולח ללקוח
router.get('/clients', requestController.getClients); // קבלת רשימת לקוחות
router.delete('/delete/:id', requestController.deleteMessage);

// מערכת התראות
router.post('/mark-read/:id', requestController.markAsRead);
router.get('/unread-count/:username', requestController.getUnreadCount);

module.exports = router;