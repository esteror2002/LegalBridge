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

module.exports = router;
