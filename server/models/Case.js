const mongoose = require('mongoose');

// ----- מסמך בודד בתוך תת-תיק -----
const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },            // שם לתצוגה (יכול להיות כמו המקורי)
  originalName: { type: String },                    // שם הקובץ המקורי מההעלאה
  mimeType: { type: String },                        // סוג תוכן (application/pdf וכו')
  size: { type: Number },                            // בייטים
  url: { type: String, required: true },             // הנתיב לקובץ, למשל: /uploads/123-file.pdf
  uploadedAt: { type: Date, default: Date.now }      // תאריך העלאה
}, { _id: true });

// ----- תת-תיק -----
const subCaseSchema = new mongoose.Schema({
  title: String,
  documents: [documentSchema] // <-- היה [String]
});

// ----- עדכון התקדמות -----
const progressSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  title: String,
  description: String,
  addedBy: String // שם מי שהוסיף את העדכון
});

// ----- תיק -----
const caseSchema = new mongoose.Schema({
  // חיבור חדש ללקוח
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  
  // שדות קיימים לתאימות
  clientName: { type: String, required: true },
  clientEmail: { type: String },
  clientPhone: { type: String },
  clientAddress: { type: String },
  
  // פרטי התיק
  status: { type: String, default: 'פתוח' }, // פתוח/סגור
  openDate: { type: Date, default: Date.now },
  closeDate: Date,
  closingNote: String,
  description: String,
  
  
  // תתי-תיקים
  subCases: [subCaseSchema],
  
  // מעקב התקדמות
  progress: [progressSchema]
});

caseSchema.index({ clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $exists: true } } });

module.exports = mongoose.model('Case', caseSchema);
