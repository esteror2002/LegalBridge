const mongoose = require('mongoose');

const subCaseSchema = new mongoose.Schema({
  title: String,
  documents: [String]
});

const caseSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  clientEmail: { type: String },
  clientPhone: { type: String },
  clientAddress: { type: String },
  status: { type: String, default: 'פתוח' },
  openDate: { type: Date, default: Date.now },
  closeDate: Date,
  description: String,
  subCases: [subCaseSchema]
});

module.exports = mongoose.model('Case', caseSchema);
