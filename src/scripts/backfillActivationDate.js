/**
 * Migration Script: Backfill activationDate for existing users
 * 
 * This script finds users where isFirstPurchaseDone = true but activationDate is null,
 * then looks up their first FranchiseSale record to get the actual activation date.
 * 
 * SAFE: Read-only on FranchiseSale, only updates activationDate field on User.
 * RUN: node src/scripts/backfillActivationDate.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/User.model.js';
import FranchiseSale from '../models/FranchiseSale.model.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sarvasolution_test_db';

async function backfillActivationDates() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find all users who are activated but don't have activationDate set
        const users = await User.find({
            isFirstPurchaseDone: true,
            $or: [
                { activationDate: null },
                { activationDate: { $exists: false } }
            ]
        }).select('_id memberId isFirstPurchaseDone activationDate');

        console.log(`📋 Found ${users.length} users needing activationDate backfill`);

        let updated = 0;
        let skipped = 0;

        for (const user of users) {
            // Find their first purchase sale record
            const firstSale = await FranchiseSale.findOne({
                user: user._id,
                isFirstPurchase: true
            }).select('saleDate').sort({ saleDate: 1 }).lean();

            if (firstSale && firstSale.saleDate) {
                await User.updateOne(
                    { _id: user._id },
                    { $set: { activationDate: firstSale.saleDate } }
                );
                console.log(`  ✅ ${user.memberId} → activationDate = ${firstSale.saleDate.toISOString().split('T')[0]}`);
                updated++;
            } else {
                // No sale record found — skip
                console.log(`  ⚠️  ${user.memberId} → No first purchase sale found, skipping`);
                skipped++;
            }
        }

        console.log(`\n🎉 Done! Updated: ${updated}, Skipped: ${skipped}, Total: ${users.length}`);

    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

backfillActivationDates();
