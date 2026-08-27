import mongoose from 'mongoose';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import Payout from '../src/models/Payout.model.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Production Database Sync Script
 * 
 * This script connects to the PRODUCTION database and fixes:
 * 1. TDS deductions in all payout records
 * 2. Rank inconsistencies (e.g., Gold with 0 stars)
 * 3. Missing UserFinance records
 * 
 * USAGE:
 * node scripts/sync_production.js
 */

const syncProduction = async () => {
    const ADMIN_CHARGE_PERCENT = 0.05;
    const TDS_PERCENT = 0.02;

    const RANK_REQUIREMENTS = {
        'Associate': 0,
        'Star': 1,
        'Bronze': 25,
        'Silver': 50,
        'Gold': 100,
        'Platinum': 200,
        'Diamond': 400,
        'Blue Diamond': 800,
        'Black Diamond': 1600,
        'Royal Diamond': 3200,
        'Crown Diamond': 6400,
        'Ambassador': 12800,
        'Crown Ambassador': 25600,
        'SSVPL Legend': 200000
    };

    let stats = {
        totalUsers: 0,
        totalPayouts: 0,
        payoutsFixed: 0,
        ranksFixed: 0,
        financeRecordsCreated: 0,
        walletRecalculated: 0
    };

    try {
        // Use production MongoDB URI
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

        console.log('🔗 Connecting to database...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected successfully\n');
        console.log('═'.repeat(70));
        console.log('🔄 PRODUCTION DATABASE SYNC');
        console.log('═'.repeat(70));

        // STEP 1: Fix TDS in all payout records
        console.log('\n💰 Step 1: Fixing TDS deductions in payouts...');
        const allPayouts = await Payout.find({});
        stats.totalPayouts = allPayouts.length;
        console.log(`   Found ${stats.totalPayouts} payout records`);

        for (const payout of allPayouts) {
            // Skip deducted, failed, or withdrawal records
            if (payout.status === 'deducted' || payout.status === 'failed' || payout.payoutType === 'withdrawal') {
                continue;
            }

            // Calculate correct values
            const correctAdminCharge = Math.round(payout.grossAmount * ADMIN_CHARGE_PERCENT * 100) / 100;
            const correctTDS = Math.round(payout.grossAmount * TDS_PERCENT * 100) / 100;
            const correctNetAmount = Math.round((payout.grossAmount - correctAdminCharge - correctTDS) * 100) / 100;

            // Check if needs fix
            const needsFix =
                payout.tdsDeducted !== correctTDS ||
                payout.adminCharge !== correctAdminCharge ||
                payout.netAmount !== correctNetAmount;

            if (needsFix) {
                console.log(`   ⚠️  Fixing payout for ${payout.memberId}:`);
                console.log(`       Old: Admin=₹${payout.adminCharge}, TDS=₹${payout.tdsDeducted}, Net=₹${payout.netAmount}`);
                console.log(`       New: Admin=₹${correctAdminCharge}, TDS=₹${correctTDS}, Net=₹${correctNetAmount}`);

                payout.adminCharge = correctAdminCharge;
                payout.tdsDeducted = correctTDS;
                payout.netAmount = correctNetAmount;
                await payout.save();

                stats.payoutsFixed++;
            }
        }

        // STEP 2: Fix rank inconsistencies
        console.log('\n👑 Step 2: Validating user ranks...');
        const allUsers = await User.find({});
        stats.totalUsers = allUsers.length;
        console.log(`   Found ${stats.totalUsers} users`);

        for (const user of allUsers) {
            const finance = await UserFinance.findOne({ user: user._id });

            if (!finance) {
                // Create missing finance record
                console.log(`   ⚠️  Creating missing finance record for ${user.memberId}`);
                await UserFinance.create({
                    user: user._id,
                    personalBV: 0,
                    leftLegBV: 0,
                    rightLegBV: 0,
                    totalBV: 0,
                    starMatching: 0,
                    wallet: {
                        totalEarnings: 0,
                        availableBalance: 0,
                        withdrawnAmount: 0,
                        pendingWithdrawal: 0
                    },
                    fastTrack: {
                        totalClosings: 0,
                        dailyClosings: 0,
                        lastClosingTime: null,
                        pendingPairLeft: 0,
                        pendingPairRight: 0,
                        carryForwardLeft: 0,
                        carryForwardRight: 0,
                        weeklyEarnings: 0,
                        closingHistory: []
                    },
                    starMatchingBonus: {
                        totalClosings: 0,
                        dailyClosings: 0,
                        lastClosingTime: null,
                        pendingStarsLeft: 0,
                        pendingStarsRight: 0,
                        carryForwardStarsLeft: 0,
                        carryForwardStarsRight: 0,
                        weeklyEarnings: 0,
                        closingHistory: []
                    }
                });
                stats.financeRecordsCreated++;
                continue;
            }

            // Validate rank
            const currentStars = finance.starMatching || 0;
            const currentRank = user.currentRank;
            const requiredStars = RANK_REQUIREMENTS[currentRank] || 0;

            // If current rank requires more stars than user has, downgrade
            if (currentStars < requiredStars) {
                let correctRank = 'Associate';
                for (const [rank, requirement] of Object.entries(RANK_REQUIREMENTS)) {
                    if (currentStars >= requirement) {
                        correctRank = rank;
                    } else {
                        break;
                    }
                }

                if (correctRank !== currentRank) {
                    console.log(`   ⚠️  Fixing rank for ${user.memberId}:`);
                    console.log(`       Current: ${currentRank} (requires ${requiredStars} stars)`);
                    console.log(`       User has: ${currentStars} stars`);
                    console.log(`       Correcting to: ${correctRank}`);

                    user.currentRank = correctRank;
                    await user.save();
                    stats.ranksFixed++;
                }
            }
        }

        // STEP 3: Recalculate wallet balances if needed
        console.log('\n💼 Step 3: Verifying wallet balances...');
        for (const user of allUsers) {
            const finance = await UserFinance.findOne({ user: user._id });
            if (!finance) continue;

            // Sum all completed payouts for this user
            const completedPayouts = await Payout.find({
                userId: user._id,
                status: 'completed'
            });

            let totalEarningsFromPayouts = 0;
            for (const payout of completedPayouts) {
                totalEarningsFromPayouts += payout.netAmount;
            }

            // Check if wallet totalEarnings matches
            if (Math.abs(finance.wallet.totalEarnings - totalEarningsFromPayouts) > 0.01) {
                console.log(`   ⚠️  Recalculating wallet for ${user.memberId}:`);
                console.log(`       Old total earnings: ₹${finance.wallet.totalEarnings}`);
                console.log(`       Correct total: ₹${totalEarningsFromPayouts}`);

                finance.wallet.totalEarnings = totalEarningsFromPayouts;
                finance.wallet.availableBalance = totalEarningsFromPayouts - finance.wallet.withdrawnAmount - finance.wallet.pendingWithdrawal;
                await finance.save();
                stats.walletRecalculated++;
            }
        }

        // Print summary
        console.log('\n');
        console.log('═'.repeat(70));
        console.log('📊 SYNC SUMMARY');
        console.log('═'.repeat(70));
        console.log(`Total Users:                  ${stats.totalUsers}`);
        console.log(`Total Payouts:                ${stats.totalPayouts}`);
        console.log(`Payouts Fixed (TDS):          ${stats.payoutsFixed}`);
        console.log(`Ranks Corrected:              ${stats.ranksFixed}`);
        console.log(`Finance Records Created:      ${stats.financeRecordsCreated}`);
        console.log(`Wallets Recalculated:         ${stats.walletRecalculated}`);
        console.log('═'.repeat(70));

        if (stats.payoutsFixed === 0 && stats.ranksFixed === 0 && stats.financeRecordsCreated === 0 && stats.walletRecalculated === 0) {
            console.log('\n✅ Database is already synchronized!');
        } else {
            console.log('\n✅ Database synchronized successfully!');
        }

    } catch (error) {
        console.error('\n❌ Sync failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
};

// Run the sync
console.log('🚀 Starting production database sync...\n');
syncProduction();
