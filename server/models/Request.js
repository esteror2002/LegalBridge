const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  username: { type: String, required: true }, // מי שולח
  recipientUsername: { type: String, required: true }, // מי מקבל
  subject: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  response: { type: String, default: '' },
  status: { type: String, default: 'open' }, // open, closed
  archived: { type: Boolean, default: false },
  sentByLawyer: { type: Boolean, default: false }, // true אם עורך דין שלח ללקוח
  read: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  deletedBy: { type: String, default: null }, // מי מחק את ההודעה
  direction: { 
    type: String, 
    enum: ['incoming', 'outgoing'], 
    default: 'incoming' 
  }, // incoming = מלקוח לעורך דין, outgoing = מעורך דין ללקוח
  messageType: {
    type: String,
    enum: ['original', 'reply'],
    default: 'original'
  } // original = הודעה חדשה, reply = תגובה
});

module.exports = mongoose.model('Request', requestSchema);