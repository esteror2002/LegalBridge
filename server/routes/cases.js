const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

/** ודא תקיית העלאות קיימת */
const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

/** Multer storage */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + file.originalname.replace(/[^\w.\-א-ת ]+/g, '');
    cb(null, safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // עד 10MB
});

/** ===== Routes ===== */

/* שימי לב: /client לפני /:id כדי למנוע התנגשות */
router.get('/client/:clientId', caseController.getCasesByClientId);

router.get('/', caseController.getAllCases);
router.post('/', caseController.addCase);

router.get('/:id', caseController.getCaseById);
router.put('/:id/status', caseController.updateStatus);
// === Progress (עדכוני התקדמות) ===
router.post('/:id/progress', caseController.addProgress);
router.put('/:id/progress', caseController.addProgress);
router.put('/:id/progress/:progressId', caseController.editProgress);     // אופציונלי
router.delete('/:id/progress/:progressId', caseController.deleteProgress); // אופציונלי

router.put('/:id/close', caseController.closeCase);// סגירת תיק והעברה לארכיון
router.put('/:id/reopen', caseController.reopenCase);// שחזור תיק סגור
router.put('/:id/documents', caseController.uploadDocuments);

router.put('/:id/subcases', caseController.addSubcase);
router.put('/:id/subcases/:index/edit', caseController.editSubcase);
router.delete('/:id/subcases/:index', caseController.deleteSubcase);

/** הוספת מסמך לפי אינדקס של תת-תיק (קובץ אמיתי) */
router.post(
  '/:id/subcases/:index/documents/upload',
  upload.single('file'),
  caseController.uploadDocumentToSubcase
);

/** פעולות על מסמך במבנה החדש (אובייקט) */
router.put('/:id/subcases/:subcaseIndex/documents/:docIndex/edit', caseController.editDocument);
router.delete('/:id/subcases/:subcaseIndex/documents/:docIndex', caseController.deleteDocument);

router.put('/:id/subcases/:index/documents', caseController.addDocumentToSubcase); // ישן (מחרוזת) – אפשר למחוק בהמשך
router.delete('/:id', caseController.deleteCase);

module.exports = router;
