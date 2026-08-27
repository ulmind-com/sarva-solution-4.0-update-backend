import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import User from '../models/User.model.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sarvasolution_test_db';

async function testSessionSave() {
    let session;
    try {
        await mongoose.connect(MONGO_URI);
        session = await mongoose.startSession();
        session.startTransaction();

        const user = await User.findOne({ memberId: 'SVS55163503' }).session(session);
        console.log("Current KYC status before save:", user.kyc.status);
        
        user.status = 'active';
        user.isFirstPurchaseDone = true;
        user.activationDate = new Date();
        
        await user.save({ session });
        await session.commitTransaction();
        console.log("Saved successfully inside session!");
    } catch (e) {
        if(session) await session.abortTransaction();
        if (e.errors && e.errors['kyc.status']) {
            console.error("Validation error detail:", e.errors['kyc.status'].properties);
            console.error("Validation error message:", e.errors['kyc.status'].message);
        } else {
            console.error(e);
        }
    } finally {
        if(session) session.endSession();
        await mongoose.disconnect();
    }
}
testSessionSave();
