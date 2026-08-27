import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserFinance from '../src/models/UserFinance.model.js';

import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const syncWalletBalance = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGO_URI is undefined in .env');
        await mongoose.connect(uri);
        console.log('Connected to MongoDB for Wallet Sync...');

        // Find users with pending weekly earnings
        const finances = await UserFinance.find({
            $or: [
                { "fastTrack.weeklyEarnings": { $gt: 0 } },
                { "starMatchingBonus.weeklyEarnings": { $gt: 0 } }
            ]
        });

        console.log(`Found ${finances.length} users with pending weekly earnings.`);

        let updatedCount = 0;
        let totalMoved = 0;

        for (const finance of finances) {
            const ftEarnings = finance.fastTrack.weeklyEarnings || 0;
            const starEarnings = finance.starMatchingBonus.weeklyEarnings || 0;
            const totalPending = ftEarnings + starEarnings;

            if (totalPending > 0) {
                // Move to Available Balance
                finance.wallet.availableBalance += totalPending;

                // IMPORTANT: Do NOT update totalEarnings here because it was already updated 
                // when the earnings were created (in matching.service.js).
                // We are just moving it from "Buffer" to "Wallet".

                // Reset Weekly Trackers
                finance.fastTrack.weeklyEarnings = 0;
                finance.starMatchingBonus.weeklyEarnings = 0;

                await finance.save();
                updatedCount++;
                totalMoved += totalPending;
                console.log(`Synced ${finance.memberId}: Moved ₹${totalPending} to Wallet.`);
            }
        }

        console.log(`\nSync Completed:`);
        console.log(`- Users Updated: ${updatedCount}`);
        console.log(`- Total Amount Moved: ₹${totalMoved}`);

    } catch (error) {
        console.error('Wallet Sync Failed:', error);
    } finally {
        await mongoose.disconnect();
    }
};

syncWalletBalance();
