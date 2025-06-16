const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');

router.get('/', caseController.getAllCases);
router.get('/:id', caseController.getCaseById); // חדש
router.post('/', caseController.addCase);
router.put('/:id/status', caseController.updateStatus);
router.put('/:id/documents', caseController.uploadDocuments);
router.put('/:id/subcases', caseController.addSubcase); // חדש
router.put('/:id/subcases/:index/documents', caseController.addDocumentToSubcase); // חדש
router.delete('/:id', caseController.deleteCase);
router.get('/client/:clientId', caseController.getCasesByClientId); // תיקי לקוח ספציפי
router.put('/:id/progress', caseController.addProgress); // הוספת עדכון התקדמות

module.exports = router;
