const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');

router.post('/send', requestController.sendRequest);
router.get('/', requestController.getAllRequests);
router.post('/reply/:id', requestController.replyToRequest);
router.post('/close/:id', requestController.closeRequest);
router.post('/archive/:id', requestController.archiveRequest); 
router.get('/my/:username', requestController.getRequestsByUser);


module.exports = router;
