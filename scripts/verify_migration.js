
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load Env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import UserFinance from '../src/models/UserFinance.model.js';
import User from '../src/models/User.model.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const verify = async () => {
    try {
        if (!MONGO_URI) throw new Error('MONGO_URI is undefined');
        await mongoose.connect(MONGO_URI);

        console.log('--- Verifying Data Migration ---');

        // Check UserFinance
        const finance = await UserFinance.findOne({});
        if (finance) {
            console.log('Sample UserFinance:', {
                memberId: finance.memberId,
                isStar: finance.isStar, // Should be defined (false/true)
                currentRankMatchCount: finance.currentRankMatchCount // Should be defined (0+)
            });
            if (finance.isStar === undefined) throw new Error('Migration Incomplete: isStar missing');
        } else {
            console.log('No UserFinance found.');
        }

        // Check Active Directs
        const userWithDirects = await User.findOne({ $or: [{ leftDirectActive: { $gt: 0 } }, { rightDirectActive: { $gt: 0 } }] });
        if (userWithDirects) {
            console.log('Found user with Active Directs:', {
                memberId: userWithDirects.memberId,
                left: userWithDirects.leftDirectActive,
                right: userWithDirects.rightDirectActive
            });
        } else {
            console.log('No users found with Active Directs yet (Might be correct if no active users exist).');
        }

        process.exit(0);
    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
};

verify();
