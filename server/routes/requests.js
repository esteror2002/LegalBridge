const express = require('express');
const router = express.Router();
const Request = require('../models/Request');

router.post('/send', async (req, res) => {
  try {
    const { username, subject, message } = req.body;

    if (!username || !subject || !message) {
      return res.status(400).json({ message: 'נא למלא את כל השדות' });
    }

    const newRequest = new Request({ username, subject, message });
    await newRequest.save();

    res.status(200).json({ message: 'הפנייה נשמרה בהצלחה' });
  } catch (error) {
    console.error('❌ שגיאה בשליחת פנייה:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
});

router.get('/', async (req, res) => {
    try {
      const requests = await Request.find().sort({ createdAt: -1 });
      res.status(200).json(requests);
    } catch (error) {
      console.error('שגיאה בקבלת הפניות:', error);
      res.status(500).json({ message: 'שגיאה בשרת' });
    }
  });

  router.post('/reply/:id', async (req, res) => {
    try {
      const request = await Request.findById(req.params.id);
      if (!request) return res.status(404).json({ message: 'פנייה לא נמצאה' });
  
      request.response = req.body.response;
      await request.save();
  
      res.status(200).json({ message: 'תגובה נשלחה בהצלחה' });
    } catch (error) {
      console.error('שגיאה בשליחת תגובה:', error);
      res.status(500).json({ message: 'שגיאה בשרת' });
    }
  });

  router.post('/close/:id', async (req, res) => {
    try {
      const request = await Request.findById(req.params.id);
      if (!request) return res.status(404).json({ message: 'פנייה לא נמצאה' });
  
      request.status = 'closed';
      await request.save();
  
      res.status(200).json({ message: 'הפנייה סומנה כסגורה' });
    } catch (error) {
      console.error('שגיאה בסגירת פנייה:', error);
      res.status(500).json({ message: 'שגיאה בשרת' });
    }
  });
  
  

module.exports = router;
