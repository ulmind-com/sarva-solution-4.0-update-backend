
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load Env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import Payout from '../src/models/Payout.model.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const verifyReset = async () => {
    try {
        if (!MONGO_URI) throw new Error('MONGO_URI is undefined');
        await mongoose.connect(MONGO_URI);

        console.log('--- Verifying System Reset ---');

        // 1. Check User Count
        const userCount = await User.countDocuments({});
        console.log(`Total Users: ${userCount}`);

        if (userCount !== 1) {
            console.error('FAIL: Expected exactly 1 user (Admin). Found:', userCount);
        } else {
            console.log('PASS: Only 1 user remains.');
        }

        // 2. Check Admin Stats
        const admin = await User.findOne({});
        if (admin) {
            console.log(`Admin Found: ${admin.memberId} (${admin.role})`);
            console.log('Admin Stats:', {
                leftChild: admin.leftChild,
                rightChild: admin.rightChild,
                leftTeamCount: admin.leftTeamCount,
                rightTeamCount: admin.rightTeamCount
            });

            if (!admin.leftChild && !admin.rightChild && admin.leftTeamCount === 0) {
                console.log('PASS: Admin Tree is empty.');
            } else {
                console.error('FAIL: Admin Tree is NOT empty.');
            }
        }

        // 3. Check Other Collections
        const financeCount = await UserFinance.countDocuments({});
        const payoutCount = await Payout.countDocuments({});

        console.log(`Total UserFinances: ${financeCount}`);
        console.log(`Total Payouts: ${payoutCount}`);

        if (financeCount === 1 && payoutCount === 0) {
            console.log('PASS: Collections are clean.');
        } else {
            console.error('FAIL: Collections are not fully clean.');
        }

        process.exit(0);

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
};

verifyReset();
