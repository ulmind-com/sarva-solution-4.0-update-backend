import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import Payout from '../src/models/Payout.model.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const testWalletUpdates = async () => {
    try {
        console.log('=== WALLET UPDATE VERIFICATION TEST ===\n');
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
        console.log('✓ Connected to database\n');

        // Find all users with payouts
        const usersWithPayouts = await Payout.distinct('userId');
        console.log(`Found ${usersWithPayouts.length} users with payout records\n`);

        let passCount = 0;
        let failCount = 0;

        for (const userId of usersWithPayouts.slice(0, 5)) { // Test first 5
            const user = await User.findById(userId);
            if (!user) continue;

            const finance = await UserFinance.findOne({ user: userId });
            if (!finance) {
                console.log(`❌ [${user.memberId}] UserFinance not found`);
                failCount++;
                continue;
            }

            // Calculate expected wallet
            const payouts = await Payout.find({ userId: userId, status: { $ne: 'cancelled' } });
            const expectedTotal = payouts.reduce((sum, p) => sum + (p.netAmount || 0), 0);

            const actualBalance = finance.wallet.availableBalance || 0;
            const actualTotal = finance.wallet.totalEarnings || 0;

            console.log(`\n📊 [${user.memberId}] ${user.fullName}`);
            console.log(`   Payouts: ${payouts.length}`);
            console.log(`   Expected Total: ₹${expectedTotal}`);
            console.log(`   Actual Total Earnings: ₹${actualTotal}`);
            console.log(`   Actual Available Balance: ₹${actualBalance}`);

            if (Math.abs(expectedTotal - actualTotal) < 1) {
                console.log(`   ✅ PASS - Wallet correctly synced`);
                passCount++;
            } else {
                console.log(`   ❌ FAIL - Mismatch detected (Diff: ₹${expectedTotal - actualTotal})`);
                failCount++;
            }
        }

        console.log(`\n=== TEST SUMMARY ===`);
        console.log(`✅ Passed: ${passCount}`);
        console.log(`❌ Failed: ${failCount}`);

        process.exit(failCount > 0 ? 1 : 0);

    } catch (e) {
        console.error('Test failed:', e);
        process.exit(1);
    }
};

testWalletUpdates();
