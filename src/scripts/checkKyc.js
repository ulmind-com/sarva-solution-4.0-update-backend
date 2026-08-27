import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/User.model.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sarvasolution_test_db';

async function checkKycStatus() {
    try {
        await mongoose.connect(MONGO_URI);
        
        const user = await User.findOne({ memberId: 'SVS55163503' }).select('kyc.status').lean();
        console.log('User kyc status:', user?.kyc?.status);
        
        // Find all with uppercase
        const invalidUsers = await User.find({ 'kyc.status': { $in: ['Approved', 'Pending', 'Rejected', 'None'] } }).select('memberId kyc.status').lean();
        console.log('Users with uppercase status:', invalidUsers);

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

checkKycStatus();
