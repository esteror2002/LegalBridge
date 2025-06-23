const mongoose = require('mongoose');

const videoMeetingSchema = new mongoose.Schema({
  // פרטי הלקוח
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  clientEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  clientPhone: {
    type: String,
    trim: true
  },

  // פרטי הפגישה
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  dateTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    default: 60, // דקות
    min: 15,
    max: 240
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // פרטי הוידאו
  meetingId: {
    type: String,
    required: true,
    trim: true
    // הסרתי את unique: true מכאן
  },
  meetingUrl: {
    type: String,
    required: true,
    trim: true
  },

  // סטטוס הפגישה
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },

  // זמנים
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },

  // מידע נוסף
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: {
    type: Date
  },
  joinedByClient: {
    type: Boolean,
    default: false
  },
  joinedByLawyer: {
    type: Boolean,
    default: false
  },
  
  // היסטוריה
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      trim: true
    }
  }]
}, {
  timestamps: true // מוסיף createdAt ו-updatedAt אוטומטית
});

// אינדקסים לביצועים טובים יותר
videoMeetingSchema.index({ dateTime: 1 });
videoMeetingSchema.index({ clientId: 1 });
videoMeetingSchema.index({ status: 1 });
videoMeetingSchema.index({ meetingId: 1 }, { unique: true });

// עדכון updatedAt אוטומטית
videoMeetingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// הוספת רשומה להיסטוריה כשהסטטוס משתנה
videoMeetingSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  next();
});

// מתודות וירטואליות
videoMeetingSchema.virtual('isUpcoming').get(function() {
  return this.dateTime > new Date() && this.status === 'scheduled';
});

videoMeetingSchema.virtual('isPast').get(function() {
  return this.dateTime < new Date();
});

videoMeetingSchema.virtual('isToday').get(function() {
  const today = new Date();
  const meetingDate = new Date(this.dateTime);
  return meetingDate.toDateString() === today.toDateString();
});

videoMeetingSchema.virtual('timeUntilMeeting').get(function() {
  const now = new Date();
  const meeting = new Date(this.dateTime);
  return meeting.getTime() - now.getTime(); // במילישניות
});

// מתודות סטטיות
videoMeetingSchema.statics.findUpcomingMeetings = function(days = 7) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  return this.find({
    dateTime: { $gte: now, $lte: futureDate },
    status: 'scheduled'
  }).sort({ dateTime: 1 });
};

videoMeetingSchema.statics.findTodaysMeetings = function() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    dateTime: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['scheduled', 'active'] }
  }).sort({ dateTime: 1 });
};

videoMeetingSchema.statics.findByClient = function(clientId) {
  return this.find({ clientId }).sort({ dateTime: -1 });
};

// מתודות אינסטנס
videoMeetingSchema.methods.markAsStarted = function() {
  this.status = 'active';
  this.startedAt = new Date();
  return this.save();
};

videoMeetingSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

videoMeetingSchema.methods.markAsCancelled = function(reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  if (reason) {
    this.statusHistory.push({
      status: 'cancelled',
      reason: reason,
      timestamp: new Date()
    });
  }
  return this.save();
};

videoMeetingSchema.methods.canJoin = function() {
  const now = new Date();
  const meetingTime = new Date(this.dateTime);
  const timeDiff = meetingTime.getTime() - now.getTime();
  
  // ניתן להיכנס 15 דקות לפני ועד 2 שעות אחרי הפגישה
  const fifteenMinutes = 15 * 60 * 1000;
  const twoHours = 2 * 60 * 60 * 1000;
  
  return (timeDiff >= -fifteenMinutes && timeDiff <= twoHours) && 
         this.status !== 'cancelled';
};

videoMeetingSchema.methods.needsReminder = function() {
  const now = new Date();
  const meetingTime = new Date(this.dateTime);
  const timeDiff = meetingTime.getTime() - now.getTime();
  
  // שליחת תזכורת 24 שעות לפני
  const twentyFourHours = 24 * 60 * 60 * 1000;
  
  return !this.reminderSent && 
         timeDiff <= twentyFourHours && 
         timeDiff > 0 && 
         this.status === 'scheduled';
};

// פורמט JSON מותאם
videoMeetingSchema.methods.toJSON = function() {
  const meeting = this.toObject();
  
  // הוספת שדות מחושבים
  meeting.isUpcoming = this.isUpcoming;
  meeting.isPast = this.isPast;
  meeting.isToday = this.isToday;
  meeting.timeUntilMeeting = this.timeUntilMeeting;
  meeting.canJoin = this.canJoin();
  
  return meeting;
};

module.exports = mongoose.model('VideoMeeting', videoMeetingSchema);