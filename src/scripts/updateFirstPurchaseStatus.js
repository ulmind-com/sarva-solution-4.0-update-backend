import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import connectDB from '../config/db.js';

dotenv.config();

import FranchiseSale from '../models/FranchiseSale.model.js';

const updateFirstPurchaseStatus = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        console.log('Starting exact migration for isFirstPurchaseDone field...');

        const users = await User.find({});
        console.log(`Found ${users.length} users to check.`);

        let updatedCount = 0;
        let trueCount = 0;
        let falseCount = 0;

        for (const user of users) {
            // ACCURATE LOGIC: Check if any sale exists for this user
            const saleCount = await FranchiseSale.countDocuments({ user: user._id });
            const hasPurchased = saleCount > 0;

            if (user.isFirstPurchaseDone !== hasPurchased) {
                user.isFirstPurchaseDone = hasPurchased;
                await user.save();
                updatedCount++;
                console.log(`Updated user ${user.memberId}: ${hasPurchased} (Sales found: ${saleCount})`);
            }

            if (hasPurchased) trueCount++;
            else falseCount++;
        }

        console.log(`Migration complete.`);
        console.log(`Total Updates: ${updatedCount}`);
        console.log(`Total w/ First Purchase: ${trueCount}`);
        console.log(`Total w/o First Purchase: ${falseCount}`);
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

updateFirstPurchaseStatus();
