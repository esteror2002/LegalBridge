const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');

router.get('/', caseController.getAllCases);
router.post('/', caseController.addCase);
router.put('/:id/status', caseController.updateStatus);
router.put('/:id/documents', caseController.uploadDocuments);
router.delete('/:id', caseController.deleteCase);


module.exports = router;
