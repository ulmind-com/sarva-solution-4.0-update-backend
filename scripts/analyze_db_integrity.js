
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

const analyze = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
        console.log('Connected.');

        const users = await User.find({}).sort({ createdAt: 1 });
        console.log(`Found ${users.length} users.`);

        for (const user of users) {
            console.log(`\nAnalyzing ${user.memberId} (${user.username})...`);
            const finance = await UserFinance.findOne({ user: user._id });

            if (!finance) {
                console.log(`❌ CRITICAL: UserFinance missing for ${user.memberId}`);
                continue;
            }

            // 1. Check User vs Finance Sync
            const checkField = (field) => {
                const uVal = user[field] || 0;
                const fVal = finance[field] || 0; // UserFinance might have different field names for some? 
                // Actually schema has same names for totalPV, leftLegPV etc.
                if (uVal !== fVal) {
                    console.log(`⚠️ MISMATCH: ${field} -> User: ${uVal}, Finance: ${fVal}`);
                }
            };

            checkField('personalPV');
            checkField('leftLegPV');
            checkField('rightLegPV');
            checkField('totalPV');

            // 2. Check Wallet
            console.log(`Wallet Balance: ${finance.wallet.availableBalance}, Total Earned: ${finance.wallet.totalEarnings}`);

            // 3. Check Payouts
            const payouts = await Payout.find({ userId: user._id });
            const totalPaid = payouts.reduce((sum, p) => sum + (p.netAmount || 0), 0);
            console.log(`Total Payouts Recorded: ${payouts.length} (Sum: ${totalPaid})`);

            if (Math.abs(totalPaid - finance.wallet.totalEarnings) > 1) {
                console.log(`⚠️ WALLET MISMATCH: Wallet says ${finance.wallet.totalEarnings}, Payouts sum ${totalPaid}`);
            }
        }

        console.log('\nAnalysis Complete.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

analyze();
