import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const testConnect = async () => {
    try {
        console.log('Testing MongoDB connection...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected Successfully:', mongoose.connection.name);
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Connection Failed:', error);
        process.exit(1);
    }
};

testConnect();
