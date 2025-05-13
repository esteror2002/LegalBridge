const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  status: { type: String, default: 'פתוח' }, // פתוח / בטיפול / סגור וכו'
  openDate: { type: Date, default: Date.now },
  closeDate: Date,
  description: String,
  documents: [String] // קישורים לקבצים שהועלו
});

module.exports = mongoose.model('Case', caseSchema);
