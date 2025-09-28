const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // בדיקה שה-.env נטען
        console.log('Checking environment variables...');
        console.log('MONGO_URI:', process.env.MONGO_URI ? 'Found' : 'NOT FOUND');
        
        // ניסיון חיבור
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/legalbridge';
        console.log('Connecting to:', mongoUri);
        
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB successfully!");
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        console.error("Make sure MongoDB is running and .env file exists");
        process.exit(1);
    }
};

module.exports = connectDB;