
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
import BVTransaction from '../src/models/BVTransaction.model.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const investigate = async () => {
    try {
        if (!MONGO_URI) throw new Error('MONGO_URI is undefined');
        await mongoose.connect(MONGO_URI);

        console.log('--- DB INVESTIGATION ---');

        const members = ['SVS000001', 'SVS000002', 'SVS000003', 'SVS000004'];

        for (const mid of members) {
            console.log(`\nChecking Member: ${mid}`);
            const user = await User.findOne({ memberId: mid });
            if (!user) {
                console.log('User not found in User collection');
                continue;
            }
            console.log(`User.leftLegPV: ${user.leftLegPV}, User.rightLegPV: ${user.rightLegPV}`);
            console.log(`User.personalPV: ${user.personalPV}`);

            const finance = await UserFinance.findOne({ memberId: mid });
            if (!finance) {
                console.log('UserFinance not found!');
            } else {
                console.log(`UserFinance.leftLegPV: ${finance.leftLegPV}, UserFinance.rightLegPV: ${finance.rightLegPV}`);
                console.log(`UserFinance.personalPV: ${finance.personalPV}`);
                console.log(`UserFinance.fastTrack.pendingPairLeft: ${finance.fastTrack.pendingPairLeft}`);
                console.log(`UserFinance.fastTrack.pendingPairRight: ${finance.fastTrack.pendingPairRight}`);
            }
        }

        console.log('\n--- Transaction Log ---');
        const transactions = await BVTransaction.find({}).sort({ createdAt: -1 }).limit(10);
        transactions.forEach(t => {
            console.log(`${t.transactionType} | Amount: ${t.pvAmount} | To: ${t.userId} | From: ${t.fromUserId} | Leg: ${t.legAffected}`);
        });

        process.exit(0);

    } catch (error) {
        console.error('Investigation Failed:', error);
        process.exit(1);
    }
};

investigate();
