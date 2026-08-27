import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import { mlmService } from '../src/services/business/mlm.service.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const fixExistingUsers = async () => {
    try {
        console.log('=== FIXING EXISTING ACTIVATED USERS ===\n');
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
        console.log('✓ Connected\n');

        // Find all active users with PV but no wallet balance
        const users = await User.find({
            status: 'active',
            personalPV: { $gt: 0 }
        }).sort({ createdAt: 1 });

        console.log(`Found ${users.length} activated users with PV\n`);

        for (const user of users) {
            const finance = await UserFinance.findOne({ user: user._id });
            if (!finance) continue;

            // Skip if already has wallet balance (already processed)
            if (finance.wallet?.availableBalance > 0) {
                console.log(`⏭️  [${user.memberId}] Already has wallet balance, skipping`);
                continue;
            }

            console.log(`\n🔧 [${user.memberId}] Propagating PV=${finance.personalPV || 0}`);

            try {
                // Manually trigger propagation
                await mlmService.propagateBVUpTree(
                    user._id,
                    user.position,
                    finance.personalBV || 0,
                    'retroactive-fix',
                    `FIX-${user.memberId}`,
                    finance.personalPV || 0
                );

                console.log(`   ✅ Propagation complete`);
            } catch (e) {
                console.error(`   ❌ Error: ${e.message}`);
            }
        }

        console.log('\n\n=== FIX COMPLETE ===');
        console.log('All existing users have been processed.');
        console.log('Check sponsor wallets for updates.\n');

        process.exit(0);

    } catch (e) {
        console.error('Fix failed:', e);
        process.exit(1);
    }
};

fixExistingUsers();
