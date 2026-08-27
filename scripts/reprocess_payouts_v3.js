
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
import { matchingService } from '../src/services/business/matching.service.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const reprocess = async () => {
    try {
        console.log('Connecting to Mongo...');
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
        console.log('Connected.');

        const finances = await UserFinance.find({});
        console.log(`Scanning ${finances.length} users...`);

        let payoutsCreated = 0;

        for (const finance of finances) {
            // Force reset lastClosingTime to allow immediate processing for this fix?
            // If we want to process accumulated volume NOW, we might need to bypass the 4-hour check in the service
            // OR we temporarily update the `lastClosingTime` to be in the past.

            // Let's try to process.
            const initialPayouts = await Payout.countDocuments({ userId: finance.user });

            // Hack: Set lastClosingTime to yesterday to bypass 4-hour check for this sync script
            // ONLY if they have pending volume
            if (finance.fastTrack.pendingPairLeft >= 500 && finance.fastTrack.pendingPairRight >= 500) {
                finance.fastTrack.lastClosingTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
                // Also reset daily closings to ensure we can pay
                finance.fastTrack.dailyClosings = 0;
                await finance.save();
            }

            try {
                await matchingService.processFastTrackMatching(finance.user);

                if (finance.isStar) {
                    await matchingService.processStarMatching(finance.user);
                }
            } catch (e) {
                console.error(`Error processing ${finance.memberId}:`, e.message);
            }

            const finalPayouts = await Payout.countDocuments({ userId: finance.user });
            if (finalPayouts > initialPayouts) {
                console.log(`✅ [${finance.memberId}] Generated ${finalPayouts - initialPayouts} new payout(s).`);
                payoutsCreated += (finalPayouts - initialPayouts);
            }
        }

        console.log(`\n--- Reprocessing Complete ---`);
        console.log(`Total New Payouts: ${payoutsCreated}`);
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

reprocess();
