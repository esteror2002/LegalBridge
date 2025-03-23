const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    approved: { type: Boolean, default: false },
    phone: { type: String },
    address: { type: String },
}, { timestamps: true });


module.exports = mongoose.model('User', userSchema);
