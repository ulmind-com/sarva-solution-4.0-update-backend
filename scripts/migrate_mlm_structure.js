
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

const migrate = async () => {
    try {
        if (!MONGO_URI) throw new Error('MONGO_URI is undefined');
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Initialize UserFinance Fields
        console.log('--- Initializing UserFinance Fields ---');
        const finances = await UserFinance.find({});
        for (const f of finances) {
            let changed = false;
            if (f.isStar === undefined) { f.isStar = false; changed = true; }
            if (f.currentRankMatchCount === undefined) { f.currentRankMatchCount = 0; changed = true; }
            if (f.starMatching === undefined) { f.starMatching = 0; changed = true; }
            if (f.rankBonus === undefined) { f.rankBonus = 0; changed = true; }

            if (changed) await f.save();
        }
        console.log(`Updated ${finances.length} Finance records.`);

        // 2. Recalculate Active/Inactive Directs
        console.log('--- Recalculating Direct Sponsor Counts ---');

        // Reset counts first
        await User.updateMany({}, {
            leftDirectActive: 0,
            leftDirectInactive: 0,
            rightDirectActive: 0,
            rightDirectInactive: 0
        });

        const allUsers = await User.find({}).select('memberId sponsorId parentId position status');
        const userMap = new Map(allUsers.map(u => [u.memberId, u]));

        let updates = 0;

        for (const child of allUsers) {
            if (!child.sponsorId) continue;

            // self-sponsorship or root check
            if (child.memberId === child.sponsorId) continue;

            const sponsor = userMap.get(child.sponsorId);
            if (!sponsor) continue;

            // Determine Leg
            let leg = null;

            // Trace up from child to find which child of sponsor this user descends from
            let current = child;
            let parent = userMap.get(current.parentId);

            // Safety limit
            let depth = 0;
            while (parent && depth < 1000) {
                if (parent.memberId === sponsor.memberId) {
                    // Current is the immediate child of sponsor (or at least the node connecting to sponsor)
                    // Check 'current.position' relative to 'parent' (sponsor)
                    // Wait, `current.position` stores the position relative to `current.parentId`.
                    // So if `current.parentId` is sponsor, `current.position` is the leg.
                    leg = current.position;
                    break;
                }
                current = parent;
                parent = userMap.get(current.parentId);
                depth++;
            }

            if (leg) {
                // Determine which field to increment
                // We need to update the SPONSOR document in MongoDB
                // We can't update 'sponsor' object in memory and save all at once easily unless we track deltas.
                // Or just do atomic $inc for each. Atomic is safer but slower. 
                // Given "0 users" (or low count), loop atomic updates is fine.

                const updateField = {};
                if (leg === 'left') {
                    if (child.status === 'active') updateField.leftDirectActive = 1;
                    else updateField.leftDirectInactive = 1;
                } else {
                    if (child.status === 'active') updateField.rightDirectActive = 1;
                    else updateField.rightDirectInactive = 1;
                }

                await User.updateOne(
                    { memberId: sponsor.memberId },
                    { $inc: updateField }
                );
                updates++;
            }
        }

        console.log(`Recalibrated counts for ${updates} sponsorship relations.`);
        console.log('Migration Complete.');
        process.exit(0);

    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
};

migrate();
