const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // למי ההתראה
  recipientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  
  // מי שלח
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  
  // סוג ההתראה
  type: {
    type: String,
    enum: [
      'case_update',      // עדכון בתיק
      'new_message',      // הודעה חדשה
      'document_added',   // מסמך נוסף
      'meeting_scheduled', // פגישה נקבעה
      'meeting_reminder', // תזכורת לפגישה
      'status_changed',   // שינוי סטטוס תיק
      'general'          // כללי
    ],
    required: true
  },
  
  // כותרת ההתראה
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  // תוכן ההתראה
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // קישור רלוונטי (אופציונלי)
  link: {
    type: String,
    default: null
  },
  
  // קשור לתיק מסוים?
  relatedCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    default: null
  },
  
  // האם נקראה?
  isRead: {
    type: Boolean,
    default: false
  },
  
  // האם נמחקה?
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  // מתי להציג (אופציונלי - לתזכורות עתידיות)
  scheduledFor: {
    type: Date,
    default: null
  },
  
  // מתי נקראה
  readAt: {
    type: Date,
    default: null
  }
  
}, { 
  timestamps: true // createdAt, updatedAt
});

// אינדקסים לחיפוש מהיר
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1, recipientId: 1 });
notificationSchema.index({ type: 1, recipientId: 1 });

// מתודה לסימון כנקרא
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// מתודה למחיקה רכה
notificationSchema.methods.softDelete = function() {
  this.isDeleted = true;
  return this.save();
};

// מתודה סטטית ליצירת התראה
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  
  // כאן אפשר להוסיף לוגיקה של WebSocket
  // לשליחה בזמן אמת
  
  return notification;
};

module.exports = mongoose.model('Notification', notificationSchema);