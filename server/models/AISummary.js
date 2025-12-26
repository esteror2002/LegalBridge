// models/AISummary.js
const mongoose = require("mongoose");

const AISummarySchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
  summary: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    default: "gemini-2.5-flash",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("AISummary", AISummarySchema);
