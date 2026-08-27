
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
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
        console.log('Connected.');

        const finances = await UserFinance.find({});
        console.log(`Found ${finances.length} finance records. Syncing...`);

        for (const finance of finances) {
            const user = await User.findById(finance.user);
            if (!user) {
                console.log(`User not found for finance record ${finance.memberId}`);
                continue;
            }

            console.log(`Syncing ${user.memberId}...`);

            // 1. Sync Fields from Finance -> User
            user.personalBV = finance.personalBV;
            user.leftLegBV = finance.leftLegBV;
            user.rightLegBV = finance.rightLegBV;
            user.totalBV = finance.totalBV;
            user.thisMonthBV = finance.thisMonthBV;
            user.thisYearBV = finance.thisYearBV;

            user.personalPV = finance.personalPV;
            user.leftLegPV = finance.leftLegPV;
            user.rightLegPV = finance.rightLegPV;
            user.totalPV = finance.totalPV;
            user.thisMonthPV = finance.thisMonthPV;
            user.thisYearPV = finance.thisYearPV;

            // Sync Rank as well just in case
            if (finance.currentRank) user.currentRank = finance.currentRank;
            if (finance.rankNumber) user.rankNumber = finance.rankNumber;
            if (finance.starMatching) user.starMatching = finance.starMatching;
            if (finance.rankBonus) user.rankBonus = finance.rankBonus;

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
