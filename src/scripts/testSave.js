import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import User from '../models/User.model.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sarvasolution_test_db';

async function testSave() {
    try {
        await mongoose.connect(MONGO_URI);
        const user = await User.findOne({ memberId: 'SVS55163503' });
        console.log("Current KYC status before save:", user.kyc.status);
        
        user.status = 'active'; // force modification to trigger save hooks
        
        await user.save();
        console.log("Saved successfully!");
    } catch (e) {
        if (e.errors && e.errors['kyc.status']) {
            console.error("Validation error detail:", e.errors['kyc.status'].properties);
            console.error("Validation error message:", e.errors['kyc.status'].message);
            console.error("Value that failed:", e.errors['kyc.status'].value);
        } else {
            console.error(e);
        }
    } finally {
        await mongoose.disconnect();
    }
}
testSave();
