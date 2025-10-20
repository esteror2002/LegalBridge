// models/Case.js
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    gridId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name:   { type: String, required: true },
    mimeType: { type: String },
    size: { type: Number },
    uploadDate: { type: Date, default: Date.now },
    kind: { type: String, enum: ['file', 'text'], default: 'file' },
    uploadedBy: { type: String, enum: ['client', 'lawyer'], default: 'lawyer' }
  },
  { _id: true }
);

const subCaseSchema = new mongoose.Schema(
  {
    title: String,
    documents: [documentSchema]
  },
  { _id: false }
);

const progressSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    title: String,
    description: String,
    addedBy: String
  },
  { _id: true }
);

const caseSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  clientName: { type: String, required: true },
  clientEmail: String,
  clientPhone: String,
  clientAddress: String,

  status: { type: String, default: 'פתוח' },
  openDate: { type: Date, default: Date.now },
  closeDate: Date,
  closingNote: String,
  description: String,

  subCases: [subCaseSchema],
  clientDocuments: [documentSchema],
  progress: [progressSchema]
});

caseSchema.index(
  { clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $exists: true } } }
);

module.exports = mongoose.model('Case', caseSchema);
