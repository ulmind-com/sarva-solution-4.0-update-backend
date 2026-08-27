import mongoose from 'mongoose';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import Payout from '../src/models/Payout.model.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Database Synchronization Script
 * 
 * This script ensures database integrity after code updates:
 * 1. Verifies all users have corresponding UserFinance records
 * 2. Validates tree structure (leftChild, rightChild references)
 * 3. Ensures all fields are properly initialized
 * 4. Fixes TDS deductions in payout records
 * 5. Reports any inconsistencies
 */

const syncDatabase = async () => {
    const ADMIN_CHARGE_PERCENT = 0.05;
    const TDS_PERCENT = 0.02;

    let stats = {
        totalUsers: 0,
        usersWithoutFinance: 0,
        financeRecordsCreated: 0,
        brokenTreeLinks: 0,
        orphanedFinanceRecords: 0,
        usersProcessed: 0,
        totalPayouts: 0,
        payoutsFixed: 0
    };

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database\n');
        console.log('🔄 Starting comprehensive database synchronization...');
        console.log('═'.repeat(60));

        // STEP 1: Get all users
        const allUsers = await User.find({});
        stats.totalUsers = allUsers.length;
        console.log(`\n📊 Found ${stats.totalUsers} users in database`);

        // STEP 2: Check and create missing UserFinance records
        console.log('\n🔍 Checking UserFinance records...');
        for (const user of allUsers) {
            let finance = await UserFinance.findOne({ user: user._id });

            if (!finance) {
                console.log(`   ⚠️  Missing finance record for ${user.memberId} - Creating...`);
                finance = await UserFinance.create({
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
                stats.usersWithoutFinance++;
            }

            // Ensure all fields exist (for older records)
            let updated = false;

            if (finance.starMatching === undefined) {
                finance.starMatching = 0;
                updated = true;
            }

            if (!finance.wallet.withdrawnAmount) {
                finance.wallet.withdrawnAmount = 0;
                updated = true;
            }

            if (updated) {
                await finance.save();
                console.log(`   ✓ Updated finance record for ${user.memberId}`);
            }

            stats.usersProcessed++;
        }

        // STEP 3: Validate tree structure
        console.log('\n🌳 Validating tree structure...');
        for (const user of allUsers) {
            // Check left child
            if (user.leftChild) {
                const leftChild = await User.findById(user.leftChild);
                if (!leftChild) {
                    console.log(`   ⚠️  Broken left link: ${user.memberId} points to non-existent user`);
                    stats.brokenTreeLinks++;
                } else if (!leftChild.parentId || leftChild.parentId.toString() !== user._id.toString()) {
                    console.log(`   ⚠️  Broken parent link: ${leftChild.memberId} parent doesn't match ${user.memberId}`);
                    stats.brokenTreeLinks++;
                }
            }

            // Check right child
            if (user.rightChild) {
                const rightChild = await User.findById(user.rightChild);
                if (!rightChild) {
                    console.log(`   ⚠️  Broken right link: ${user.memberId} points to non-existent user`);
                    stats.brokenTreeLinks++;
                } else if (!rightChild.parentId || rightChild.parentId.toString() !== user._id.toString()) {
                    console.log(`   ⚠️  Broken parent link: ${rightChild.memberId} parent doesn't match ${user.memberId}`);
                    stats.brokenTreeLinks++;
                }
            }

            // Check parent
            if (user.parentId) {
                const parent = await User.findById(user.parentId);
                if (!parent) {
                    console.log(`   ⚠️  Orphaned user: ${user.memberId} parent doesn't exist`);
                    stats.brokenTreeLinks++;
                }
            }
        }

        // STEP 4: Check for orphaned finance records
        console.log('\n🔍 Checking for orphaned finance records...');
        const allFinances = await UserFinance.find({});
        for (const finance of allFinances) {
            const userExists = await User.findById(finance.user);
            if (!userExists) {
                console.log(`   ⚠️  Orphaned finance record: ${finance._id} (user doesn't exist)`);
                stats.orphanedFinanceRecords++;
            }
        }

        // STEP 5: Fix TDS in Payout Records
        console.log('\n💰 Validating and fixing payout TDS deductions...');
        const allPayouts = await Payout.find({});
        stats.totalPayouts = allPayouts.length;

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
                console.log(`   ⚠️  Fixing TDS for ${payout.memberId} (${payout.payoutType}): TDS ${payout.tdsDeducted} → ${correctTDS}`);
                payout.adminCharge = correctAdminCharge;
                payout.tdsDeducted = correctTDS;
                payout.netAmount = correctNetAmount;
                await payout.save();
                stats.payoutsFixed++;
            }
        }

        // STEP 6: Print summary
        console.log('\n');
        console.log('═'.repeat(60));
        console.log('📊 SYNCHRONIZATION SUMMARY');
        console.log('═'.repeat(60));
        console.log(`Total Users:                  ${stats.totalUsers}`);
        console.log(`Users Processed:              ${stats.usersProcessed}`);
        console.log(`Missing Finance Records:      ${stats.usersWithoutFinance}`);
        console.log(`Finance Records Created:      ${stats.financeRecordsCreated}`);
        console.log(`Broken Tree Links:            ${stats.brokenTreeLinks}`);
        console.log(`Orphaned Finance Records:     ${stats.orphanedFinanceRecords}`);
        console.log(`Total Payouts:                ${stats.totalPayouts}`);
        console.log(`Payouts Fixed (TDS):          ${stats.payoutsFixed}`);
        console.log('═'.repeat(60));

        if (stats.usersWithoutFinance === 0 && stats.brokenTreeLinks === 0 &&
            stats.orphanedFinanceRecords === 0 && stats.payoutsFixed === 0) {
            console.log('\n✅ Database is fully synchronized and consistent!');
        } else {
            console.log('\n⚠️  Database has been synchronized. Issues found and fixed.');
        }

    } catch (error) {
        console.error('\n❌ Synchronization failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
};

// Run the sync
syncDatabase();
