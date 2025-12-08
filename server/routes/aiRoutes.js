const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// הנתיב יהיה: /api/ai/summarize
router.post('/summarize', aiController.summarizeDocument);

module.exports = router;