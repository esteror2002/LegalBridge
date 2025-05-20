const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  username: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  response: { type: String, default: '' },
  status: { type: String, default: 'open' },
  archived: { type: Boolean, default: false }

});

module.exports = mongoose.model('Request', requestSchema);
