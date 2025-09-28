// server/routes/time.js
const router = require('express').Router();
const C = require('../controllers/timeController');

// יצירת/עצירת לוגים
router.post('/start', C.start);
router.put('/stop/:id', C.stop);
router.post('/manual', C.manual);

// סיכומים
router.get('/case/:caseId/total', C.caseTotal);
router.get('/daily', C.daily);

module.exports = router;
