
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

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const investigate = async () => {
    try {
        console.log('Connecting to Mongo...');
        if (!MONGO_URI) throw new Error('No Mongo URI found');

        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected.');

        const members = ['SVS000001', 'SVS000002'];

        for (const mid of members) {
            console.log(`\n--- Member: ${mid} ---`);
            const user = await User.findOne({ memberId: mid }).lean();
            if (user) {
                console.log(`[User Coll] LeftPV: ${user.leftLegPV}, RightPV: ${user.rightLegPV}`);
            } else {
                console.log('[User Coll] Not Found');
            }

            const finance = await UserFinance.findOne({ memberId: mid }).lean();
            if (finance) {
                console.log(`[Finance Coll] LeftPV: ${finance.leftLegPV}, RightPV: ${finance.rightLegPV}`);
                console.log(`[Finance Coll] FastTrack Pending: L=${finance.fastTrack?.pendingPairLeft}, R=${finance.fastTrack?.pendingPairRight}`);
            } else {
                console.log('[Finance Coll] Not Found');
            }
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

investigate();
