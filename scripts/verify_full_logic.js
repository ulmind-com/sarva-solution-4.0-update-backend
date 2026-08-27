
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
import { rankService } from '../src/services/business/rank.service.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const verifyLogic = async () => {
    try {
        if (!MONGO_URI) throw new Error('MONGO_URI is undefined');
        await mongoose.connect(MONGO_URI);

        console.log('--- STARTING FULL LOGIC VERIFICATION ---');

        // 1. Setup Test User (Simulate "User A" from requirements)
        // Ensure clean state
        const testMemberId = 'TEST001';
        await User.deleteOne({ memberId: testMemberId });
        await UserFinance.deleteOne({ 'memberId': testMemberId }); // Adjust if needed
        await Payout.deleteMany({ userId: testMemberId }); // Need to handle by userId reference properly below

        // Create User
        const user = await User.create({
            memberId: testMemberId,
            fullName: 'Test User A',
            email: 'testa@example.com',
            phoneNumber: '9999999999',
            password: 'hashedpassword',
            role: 'user',
            status: 'active',
            leftDirectActive: 1, // Qualified
            rightDirectActive: 1 // Qualified
        });

        const finance = await UserFinance.create({
            user: user._id,
            memberId: testMemberId,
            fastTrack: { dailyClosings: 0, pendingPairLeft: 0, pendingPairRight: 0 },
            starMatchingBonus: { dailyClosings: 0, pendingStarsLeft: 0, pendingStarsRight: 0 },
            currentRank: 'Associate',
            isStar: false
        });

        console.log(`Step 1: User Created (${testMemberId}). Fast Track Qualified.`);

        // 2. Simulate Fast Track Matches (First 2 Matches)
        // Match 1: 2:1 (First Payout)
        finance.fastTrack.pendingPairLeft = 1000; // 2 units
        finance.fastTrack.pendingPairRight = 500; // 1 unit
        await finance.save();

        console.log('Step 2: Simulating First Match (2:1)...');
        await matchingService.processFastTrackMatching(user._id);

        // Assert: 1 Payout (500), Deductions applied
        let payouts = await Payout.find({ userId: user._id, payoutType: 'fast-track-bonus' });
        if (payouts.length !== 1) throw new Error(`Expected 1 Payout, found ${payouts.length}`);
        if (payouts[0].netAmount !== 465) throw new Error(`Expected Net 465 (500 - 35), found ${payouts[0].netAmount}`);
        console.log('PASS: First Match (2:1) Paid Correctly.');

        // Match 2: 1:1 (Second Payout)
        finance.fastTrack.pendingPairLeft = 500;
        finance.fastTrack.pendingPairRight = 500;
        finance.fastTrack.dailyClosings = 0; // Reset closing limit sim
        await finance.save();

        console.log('Step 3: Simulating Second Match (1:1)...');
        await matchingService.processFastTrackMatching(user._id);
        payouts = await Payout.find({ userId: user._id, payoutType: 'fast-track-bonus' });
        if (payouts.length !== 2) throw new Error(`Expected 2 Payouts, found ${payouts.length}`);
        console.log('PASS: Second Match (1:1) Paid Correctly.');

        // 3. Simulate 3rd Match (Deduction)
        finance.fastTrack.pendingPairLeft = 500;
        finance.fastTrack.pendingPairRight = 500;
        finance.fastTrack.dailyClosings = 0;
        await finance.save();

        console.log('Step 4: Simulating Third Match (Deduction)...');
        await matchingService.processFastTrackMatching(user._id);

        const deductions = await Payout.find({ userId: user._id, payoutType: 'fast-track-deduction' });
        if (deductions.length !== 1) throw new Error(`Expected 1 Deduction, found ${deductions.length}`);
        if (deductions[0].metadata.closingCount !== 3) throw new Error('Deduction count mismatch');
        console.log('PASS: 3rd Match Deducted Correctly.');

        // 4. Simulate Star Matching (Upgrades)
        // Assume user is now Star (skip to 12 deductions) and baselines
        finance.isStar = true;
        // First Star Match: 2:1
        finance.starMatchingBonus.pendingStarsLeft = 2;
        finance.starMatchingBonus.pendingStarsRight = 1;
        await finance.save();

        console.log('Step 5: Simulating First Star Match (2:1)...');
        await matchingService.processStarMatching(user._id);

        let starPayouts = await Payout.find({ userId: user._id, payoutType: 'star-matching-bonus' });
        if (starPayouts.length !== 1) throw new Error(`Expected 1 Star Payout, found ${starPayouts.length}`);
        if (starPayouts[0].grossAmount !== 1500) throw new Error(`Expected Star Payout 1500, found ${starPayouts[0].grossAmount}`);
        console.log('PASS: First Star Match (2:1) Paid Correctly.');

        // 5. Verify Rank Accumulation
        const updatedFinance = await UserFinance.findOne({ user: user._id });
        if (updatedFinance.currentRankMatchCount !== 1) throw new Error(`Expected Rank Count 1, found ${updatedFinance.currentRankMatchCount}`);
        console.log('PASS: Rank Count Incremented.');

        console.log('--- ALL VERIFICATION STEPS PASSED ---');
        process.exit(0);

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
};

verifyLogic();
