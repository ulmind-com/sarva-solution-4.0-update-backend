
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
import { matchingService } from '../src/services/business/matching.service.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const syncAndFix = async () => {
    try {
        console.log('Connecting to Mongo...');
        if (!MONGO_URI) throw new Error('No Mongo URI found');

        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
        console.log('Connected.');

        const finances = await UserFinance.find({});
        console.log(`Found ${finances.length} finance records. Syncing...`);

        for (const finance of finances) {
            // Find User
            const user = await User.findById(finance.user);
            if (!user) {
                console.log(`User not found for finance record ${finance.memberId}`);
                // Should delete finance record if user deleted? No, keep safely.
                continue;
            }

            console.log(`Syncing ${user.memberId}...`);

            // 1. Sync Fields from Finance -> User
            user.personalBV = finance.personalBV || 0;
            user.leftLegBV = finance.leftLegBV || 0;
            user.rightLegBV = finance.rightLegBV || 0;
            user.totalBV = finance.totalBV || 0;
            user.thisMonthBV = finance.thisMonthBV || 0;
            user.thisYearBV = finance.thisYearBV || 0;

            user.personalPV = finance.personalPV || 0;
            user.leftLegPV = finance.leftLegPV || 0;
            user.rightLegPV = finance.rightLegPV || 0;
            user.totalPV = finance.totalPV || 0;
            user.thisMonthPV = finance.thisMonthPV || 0;
            user.thisYearPV = finance.thisYearPV || 0;

            await user.save();

            // 2. Re-Trigger Matching Logic
            // If data was there but matching didn't run (e.g. error in loop), this will fix it.
            // If already paid, it won't pay again (idempotent checks in service).
            try {
                // Determine if user is qualified first?
                // matchingService handles qualification checks inside.
                await matchingService.processFastTrackMatching(user._id);

                if (finance.isStar) {
                    await matchingService.processStarMatching(user._id);
                }
            } catch (err) {
                console.error(`Error processing matching for ${user.memberId}:`, err.message);
            }
        }

        console.log('Sync and Fix Complete.');
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

syncAndFix();
