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

const diagnoseSystem = async () => {
    try {
        console.log('=== SYSTEM DIAGNOSTIC ===\n');
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
        console.log('✓ Connected\n');

        // Get all users
        const users = await User.find({}).sort({ createdAt: 1 });
        console.log(`Found ${users.length} users in system\n`);

        for (const user of users) {
            console.log(`\n📋 [${user.memberId}] ${user.fullName}`);
            console.log(`   Status: ${user.status}`);
            console.log(`   Position: ${user.position} (Parent: ${user.parentId || 'ROOT'})`);
            console.log(`   Sponsor: ${user.sponsorId || 'None'}`);

            const finance = await UserFinance.findOne({ user: user._id });
            if (finance) {
                console.log(`\n   💰 Financial Data:`);
                console.log(`      Personal PV: ${finance.personalPV || 0}`);
                console.log(`      Left Leg PV: ${finance.leftLegPV || 0}`);
                console.log(`      Right Leg PV: ${finance.rightLegPV || 0}`);
                console.log(`      Pending Left: ${finance.fastTrack?.pendingPairLeft || 0}`);
                console.log(`      Pending Right: ${finance.fastTrack?.pendingPairRight || 0}`);
                console.log(`      Wallet Balance: ₹${finance.wallet?.availableBalance || 0}`);
                console.log(`      Total Earnings: ₹${finance.wallet?.totalEarnings || 0}`);

                // Check qualification
                console.log(`\n   ✅ Qualification:`);
                console.log(`      Left Direct Active: ${user.leftDirectActive}`);
                console.log(`      Right Direct Active: ${user.rightDirectActive}`);
                const qualified = user.leftDirectActive >= 1 && user.rightDirectActive >= 1;
                console.log(`      STATUS: ${qualified ? '✅ QUALIFIED' : '❌ NOT QUALIFIED'}`);

                // Check if matching should have occurred
                const leftPV = finance.fastTrack?.pendingPairLeft || 0;
                const rightPV = finance.fastTrack?.pendingPairRight || 0;

                if (leftPV >= 500 && rightPV >= 500) {
                    console.log(`\n   ⚠️  ALERT: Has sufficient PV for matching but no payout!`);
                    console.log(`      Left: ${leftPV}, Right: ${rightPV}`);

                    // Check for blocks
                    console.log(`\n   🔍 Checking blocks:`);
                    console.log(`      Daily Closings: ${finance.fastTrack?.dailyClosings || 0}/6`);
                    console.log(`      Last Closing: ${finance.fastTrack?.lastClosingTime || 'Never'}`);
                }
            } else {
                console.log(`   ❌ No UserFinance record!`);
            }

            // Check payouts
            const payouts = await Payout.find({ userId: user._id });
            console.log(`\n   📊 Payouts: ${payouts.length}`);
            if (payouts.length > 0) {
                payouts.forEach(p => {
                    console.log(`      - ${p.payoutType}: ₹${p.netAmount} (${p.status})`);
                });
            }
        }

        console.log('\n\n=== DIAGNOSTIC COMPLETE ===');
        process.exit(0);

    } catch (e) {
        console.error('Diagnostic failed:', e);
        process.exit(1);
    }
};

diagnoseSystem();
