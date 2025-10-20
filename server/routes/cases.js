// routes/cases.js
const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const multer = require('multer');

// === Multer בזיכרון (אין כתיבה לדיסק) ===
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // עד 25MB (לשנות לפי צורך)
});

// ====== Routes ======

// לפי לקוח
router.get('/client/:clientId', caseController.getCasesByClientId);

// תיקים
router.get('/', caseController.getAllCases);
router.post('/', caseController.addCase);
router.get('/:id', caseController.getCaseById);
router.put('/:id/status', caseController.updateStatus);
router.put('/:id/close', caseController.closeCase);
router.put('/:id/reopen', caseController.reopenCase);
router.delete('/:id', caseController.deleteCase);

// התקדמות
router.post('/:id/progress', caseController.addProgress);
router.put('/:id/progress/:progressId', caseController.editProgress);
router.delete('/:id/progress/:progressId', caseController.deleteProgress);

// תתי-תיקים
router.put('/:id/subcases', caseController.addSubcase);
router.put('/:id/subcases/:index/edit', caseController.editSubcase);
router.delete('/:id/subcases/:index', caseController.deleteSubcase);

// מסמכים לתת-תיק (GridFS)
router.post(
  '/:id/subcases/:index/documents/upload',
  upload.single('file'),
  caseController.uploadDocumentToSubcase
);
router.put(
  '/:id/subcases/:subcaseIndex/documents/:docIndex/edit',
  caseController.editDocumentName
);
router.delete(
  '/:id/subcases/:subcaseIndex/documents/:docIndex',
  caseController.deleteDocument
);

// TXT (GridFS)
router.post('/:id/subcases/:subIdx/documents/text', caseController.createTextDocument);
router.put('/:id/subcases/:subIdx/documents/:docIdx/text', caseController.updateTextDocument);
router.get('/:id/subcases/:subIdx/documents/:docIdx/text', caseController.getTextDocumentContent);

// העלאות מצד הלקוח
router.post('/:id/client-upload', upload.single('file'), caseController.clientUploadDocument);
router.get('/:id/client-documents', caseController.getClientDocuments);
router.delete('/:id/client-documents/:docId', caseController.deleteClientDocument);
router.post('/:id/client-documents/:docId/assign', caseController.assignClientDocumentToSubcase);

// הורדה/תצוגה של קובץ לפי GridFS id
router.get('/files/:fileId', caseController.streamFileById);

module.exports = router;
