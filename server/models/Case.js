const mongoose = require('mongoose');

const subCaseSchema = new mongoose.Schema({
  title: String,
  documents: [String]
});

const progressSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  title: String,
  description: String,
  addedBy: String // שם מי שהוסיף את העדכון
});

const caseSchema = new mongoose.Schema({
  // חיבור חדש ללקוח
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  
  // שמירה על השדות הקיימים לתאימות לאחור
  clientName: { type: String, required: true },
  clientEmail: { type: String },
  clientPhone: { type: String },
  clientAddress: { type: String },
  
  // פרטי התיק
  status: { type: String, default: 'פתוח' },
  openDate: { type: Date, default: Date.now },
  closeDate: Date,
  description: String,
  
  // תתי-תיקים
  subCases: [subCaseSchema],
  
  // מעקב התקדמות - חדש!
  progress: [progressSchema]
});

module.exports = mongoose.model('Case', caseSchema);