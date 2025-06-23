const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // חיבור למשתמש (עורך הדין)
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  
  // פרטי המשימה
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    maxlength: 1000
  },
  
  // תאריך יעד
  dueDate: {
    type: String, // YYYY-MM-DD
    required: true
  },
  
  dueTime: {
    type: String, // HH:MM (אופציונלי)
    default: null
  },
  
  // עדיפות
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // קטגוריה
  category: {
    type: String,
    enum: [
      'legal',      // עבודה משפטית
      'admin',      // ניהול
      'client',     // לקוחות
      'court',      // בית משפט
      'research',   // מחקר
      'personal'    // אישי
    ],
    default: 'legal'
  },
  
  // סטטוס
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // זמן משוער (בדקות)
  estimatedDuration: {
    type: Number,
    min: 5,
    max: 480, // עד 8 שעות
    default: 60
  },
  
  // זמן בפועל (בדקות)
  actualDuration: {
    type: Number,
    default: null
  },
  
  // חיבור ללקוח (אופציונלי)
  relatedClientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // חיבור לתיק (אופציונלי)
  relatedCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    default: null
  },
  
  // תאריך השלמה
  completedAt: {
    type: Date,
    default: null
  },
  
  // הערות
  notes: {
    type: String,
    maxlength: 500
  },
  
  // תזכורת
  reminderEnabled: {
    type: Boolean,
    default: false
  },
  
  reminderMinutes: {
    type: Number,
    default: 60 // שעה לפני
  },
  
  // האם המשימה חוזרת על עצמה
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  recurringPattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: null
  },
  
  // מזהה המשימה הראשית (אם זה משימה חוזרת)
  parentTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  }
  
}, { 
  timestamps: true 
});

// אינדקסים לחיפוש מהיר
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ category: 1, userId: 1 });
taskSchema.index({ relatedClientId: 1 });
taskSchema.index({ relatedCaseId: 1 });

// וירטואל - האם המשימה באיחור
taskSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  
  const now = new Date();
  const dueDateTime = this.dueTime 
    ? new Date(`${this.dueDate}T${this.dueTime}:00`)
    : new Date(`${this.dueDate}T23:59:59`);
    
  return dueDateTime < now;
});

// וירטואל - זמן עד למועד אחרון
taskSchema.virtual('timeUntilDue').get(function() {
  const now = new Date();
  const dueDateTime = this.dueTime 
    ? new Date(`${this.dueDate}T${this.dueTime}:00`)
    : new Date(`${this.dueDate}T23:59:59`);
    
  const diffMs = dueDateTime - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMs < 0) return 'באיחור';
  if (diffDays > 0) return `${diffDays} ימים`;
  if (diffHours > 0) return `${diffHours} שעות`;
  return 'פחות משעה';
});

// מתודה לסימון כהושלם
taskSchema.methods.markCompleted = function(actualDuration = null) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (actualDuration) {
    this.actualDuration = actualDuration;
  }
  return this.save();
};

// מתודה לביטול
taskSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

// מתודה סטטית לקבלת משימות לתאריך
taskSchema.statics.getTasksForDate = function(userId, date) {
  return this.find({
    userId,
    dueDate: date,
    status: { $ne: 'cancelled' }
  }).sort({ priority: -1, dueTime: 1 });
};

// מתודה סטטית לקבלת משימות באיחור
taskSchema.statics.getOverdueTasks = function(userId) {
  const today = new Date().toISOString().split('T')[0];
  return this.find({
    userId,
    dueDate: { $lt: today },
    status: { $in: ['pending', 'in_progress'] }
  }).sort({ dueDate: 1 });
};

// מתודה סטטית לקבלת משימות לשבוע הקרוב
taskSchema.statics.getUpcomingTasks = function(userId, days = 7) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);
  
  return this.find({
    userId,
    dueDate: {
      $gte: today.toISOString().split('T')[0],
      $lte: futureDate.toISOString().split('T')[0]
    },
    status: { $in: ['pending', 'in_progress'] }
  }).sort({ dueDate: 1, priority: -1 });
};

module.exports = mongoose.model('Task', taskSchema);