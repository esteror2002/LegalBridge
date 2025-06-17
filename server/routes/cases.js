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
router.put('/:id/subcases/:index/edit', caseController.editSubcase);
router.delete('/:id/subcases/:index', caseController.deleteSubcase);
router.put('/:id/subcases/:subcaseIndex/documents/:docIndex/edit', caseController.editDocument);
router.delete('/:id/subcases/:subcaseIndex/documents/:docIndex', caseController.deleteDocument);


module.exports = router;
