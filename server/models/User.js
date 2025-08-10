const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    approved: { type: Boolean, default: false },
    phone: { type: String },
    address: { type: String },
    twoFactorMethod: { type: String, enum: ['sms', null], default: null },
    phoneE164: { type: String, default: null },
    phoneVerified: { type: Boolean, default: false },

    
    // 🔐 הוספת שדות לאימות דו-שלבי
    twoFactorEnabled: { 
        type: Boolean, 
        default: false 
    },
    twoFactorSecret: { 
        type: String, 
        default: null 
    },
    twoFactorBackupCodes: [{ 
        type: String 
    }]
    
}, { timestamps: true });

// מתודה ליצירת קודי גיבוי
userSchema.methods.generateBackupCodes = function() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        codes.push(code);
    }
    this.twoFactorBackupCodes = codes;
    return codes;
};

// מתודה לאימות קוד גיבוי
userSchema.methods.verifyBackupCode = function(code) {
    const index = this.twoFactorBackupCodes.indexOf(code.toUpperCase());
    if (index !== -1) {
        // הסרת הקוד לאחר שימוש
        this.twoFactorBackupCodes.splice(index, 1);
        return true;
    }
    return false;
};

module.exports = mongoose.model('User', userSchema);