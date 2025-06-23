const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  // חיבור למשתמש (עורך הדין)
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  
  // פרטי האירוע
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    maxlength: 1000
  },
  
  // תאריך ושעה
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  
  startTime: {
    type: String, // HH:MM
    required: true
  },
  
  endTime: {
    type: String, // HH:MM
    default: null
  },
  
  // מיקום
  location: {
    type: String,
    maxlength: 200
  },
  
  // סוג האירוע
  type: {
    type: String,
    enum: [
      'meeting',        // פגישה
      'court',         // דיון בבית משפט
      'deadline',      // דדליין
      'reminder',      // תזכורת
      'consultation',  // ייעוץ
      'research',      // מחקר
      'personal'       // אישי
    ],
    default: 'meeting'
  },
  
  // עדיפות
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
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
  
  // תזכורת
  reminderEnabled: {
    type: Boolean,
    default: false
  },
  
  reminderMinutes: {
    type: Number,
    default: 30 // 30 דקות לפני
  },
  
  // הערות פרטיות
  notes: {
    type: String,
    maxlength: 1000
  },
  
  // סטטוס האירוע
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  
  // האם האירוע חוזר על עצמו
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  recurringPattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    default: null
  },
  
  recurringEndDate: {
    type: String, // YYYY-MM-DD
    default: null
  },
  
  // מזהה האירוע הראשי (אם זה אירוע חוזר)
  parentEventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  }
  
}, { 
  timestamps: true 
});

// אינדקסים לחיפוש מהיר
eventSchema.index({ userId: 1, date: 1 });
eventSchema.index({ userId: 1, type: 1 });
eventSchema.index({ date: 1, startTime: 1 });
eventSchema.index({ relatedClientId: 1 });
eventSchema.index({ relatedCaseId: 1 });

// מתודה לקבלת תאריך ושעה מלא
eventSchema.virtual('fullDateTime').get(function() {
  return new Date(`${this.date}T${this.startTime}:00`);
});

// מתודה לבדיקה אם האירוע עבר
eventSchema.virtual('isPast').get(function() {
  const now = new Date();
  const eventTime = new Date(`${this.date}T${this.startTime}:00`);
  return eventTime < now;
});

// מתודה ליצירת אירועים חוזרים
eventSchema.methods.createRecurringEvents = async function(endDate) {
  if (!this.isRecurring || !this.recurringPattern) return [];
  
  const events = [];
  const startDate = new Date(this.date);
  const endDateObj = new Date(endDate);
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDateObj) {
    // הוספת תקופה לפי הדפוס
    switch (this.recurringPattern) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
    }
    
    if (currentDate <= endDateObj) {
      const newEvent = new this.constructor({
        ...this.toObject(),
        _id: undefined,
        date: currentDate.toISOString().split('T')[0],
        parentEventId: this._id,
        createdAt: undefined,
        updatedAt: undefined
      });
      
      events.push(newEvent);
    }
  }
  
  return await this.constructor.insertMany(events);
};

// מתודה סטטית לקבלת אירועים לתקופה
eventSchema.statics.getEventsForPeriod = function(userId, startDate, endDate) {
  return this.find({
    userId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1, startTime: 1 });
};

// מתודה סטטית לקבלת אירועים ליום
eventSchema.statics.getEventsForDate = function(userId, date) {
  return this.find({
    userId,
    date
  }).sort({ startTime: 1 });
};

module.exports = mongoose.model('Event', eventSchema);