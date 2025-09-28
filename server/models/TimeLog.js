const mongoose = require('mongoose');

const TimeLogSchema = new mongoose.Schema({
  lawyerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Case', default: null },
  activity:   { type: String, enum: ['case','request','task','meeting','other'], required: true },
  notes:      { type: String, default: '' },
  startedAt:  { type: Date, required: true, default: Date.now },
  endedAt:    { type: Date, default: null },
  durationMin:{ type: Number, default: 0 },   // מחושב אוטומטית כשמסיימים
}, { timestamps: true });

TimeLogSchema.pre('save', function(next){
  if (this.endedAt && this.durationMin === 0) {
    const ms = this.endedAt - this.startedAt;
    this.durationMin = Math.max(0, Math.round(ms / 60000));
  }
  next();
});

module.exports = mongoose.model('TimeLog', TimeLogSchema);
