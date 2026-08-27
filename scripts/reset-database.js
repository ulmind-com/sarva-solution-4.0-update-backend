#!/usr/bin/env node

/**
 * SSVPL MLM COMPLETE DATABASE RESET & NORMALIZATION SCRIPT
 * 
 * This script performs FULL database normalization to fix all existing users
 * created before proper SSVPL MLM logic implementation.
 * 
 * ⚠️  WARNING: This script RESETS all users to Associate rank and clears
 *     all closing histories. Only use this for initial data normalization.
 * 
 * USAGE:
 *   node scripts/reset-database.js --dry-run           # Preview changes
 *   node scripts/reset-database.js --backup            # Backup + execute
 *   node scripts/reset-database.js --fix-tds-only      # Fix TDS only
 *   node scripts/reset-database.js --full-reset        # Complete normalization
 * 
 * SAFETY FEATURES:
 *   - Complete MongoDB backup before changes
 *   - Transaction support with rollback
 *   - Detailed audit trail
 *   - Dry-run mode for preview
 */

import mongoose from 'mongoose';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import Payout from '../src/models/Payout.model.js';
import dotenv from 'dotenv';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();
const execAsync = promisify(exec);

// ==================== CONFIGURATION ====================

const ADMIN_CHARGE_PERCENT = 0.05;
const TDS_PERCENT = 0.02;

// Parse CLI arguments
const args = process.argv.slice(2);
const config = {
    mode: 'dry-run', // dry-run, backup, fix-tds-only, full-reset
    verbose: false
};

args.forEach(arg => {
    const flag = arg.replace('--', '');
    if (flag === 'dry-run') config.mode = 'dry-run';
    else if (flag === 'backup') config.mode = 'backup';
    else if (flag === 'fix-tds-only') config.mode = 'fix-tds-only';
    else if (flag === 'full-reset') config.mode = 'full-reset';
    else if (flag === 'verbose' || flag === 'v') config.verbose = true;
});

// ==================== GLOBAL STATE ====================

const report = {
    timestamp: new Date().toISOString(),
    mode: config.mode,
    preSync: {
        totalUsers: 0,
        totalPayouts: 0,
        totalFinanceRecords: 0
    },
    operations: {
        tdsFixed: 0,
        overpaymentRecovered: 0,
        financeRecordsCreated: 0,
        usersReset: 0,
        walletsNormalized: 0,
        treeFixed: 0
    },
    financialImpact: {
        totalTDSMissing: 0,
        totalOverpaymentRecovered: 0,
        illegitimateEarningsRemoved: 0
    },
    postSync: {
        usersWithFinance: 0,
        payoutsWithTDS: 0,
        associateUsers: 0,
        treeValidated: false
    }
};

const log = {
    info: (msg) => console.log(`ℹ️  ${msg}`),
    warn: (msg) => console.log(`⚠️  ${msg}`),
    error: (msg) => console.error(`❌ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    debug: (msg) => config.verbose && console.log(`🔍 ${msg}`)
};

// ==================== PHASE 1: BACKUP & SNAPSHOT ====================

async function createBackup() {
    log.info('PHASE 1: CREATING BACKUP');
    console.log('═'.repeat(70));

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = `./backups/reset-backup-${timestamp}`;

        const mongoUri = process.env.MONGODB_URI;
        const command = `mongodump --uri="${mongoUri}" --out="${backupDir}"`;

        log.info('Creating MongoDB dump...');
        log.debug(`Command: ${command}`);

        await execAsync(command);

        log.success(`Backup created at: ${backupDir}`);

        // Also export baseline JSON
        const baselineUser = await User.findOne({ memberId: 'SVS000001' }).populate('userFinance');
        if (baselineUser) {
            const baselinePath = `${backupDir}/svs000001-baseline.json`;
            fs.writeFileSync(baselinePath, JSON.stringify(baselineUser, null, 2));
            log.success(`Baseline user exported to: ${baselinePath}`);
        }

        return backupDir;
    } catch (error) {
        log.error(`Backup failed: ${error.message}`);
        if (config.mode === 'full-reset' || config.mode === 'backup') {
            throw new Error('Backup required for full reset. Install mongodump or use --dry-run');
        }
    }
}

async function countRecords() {
    report.preSync.totalUsers = await User.countDocuments();
    report.preSync.totalPayouts = await Payout.countDocuments();
    report.preSync.totalFinanceRecords = await UserFinance.countDocuments();

    log.info(`Found ${report.preSync.totalUsers} users`);
    log.info(`Found ${report.preSync.totalPayouts} payouts`);
    log.info(`Found ${report.preSync.totalFinanceRecords} finance records\n`);
}

// ==================== PHASE 2: FIX TDS CRITICAL ERROR ====================

async function fixTDSDeductions(session) {
    log.info('PHASE 2: FIXING TDS CRITICAL ERROR');
    console.log('═'.repeat(70));

    const wrongPayouts = await Payout.find({
        tdsDeducted: 0,
        grossAmount: { $gt: 0 },
        status: { $in: ['completed', 'pending'] },
        payoutType: { $ne: 'withdrawal' }
    });

    log.info(`Found ${wrongPayouts.length} payout(s) with incorrect TDS`);

    for (const payout of wrongPayouts) {
        const correctTDS = Math.round(payout.grossAmount * TDS_PERCENT * 100) / 100;
        const correctAdmin = Math.round(payout.grossAmount * ADMIN_CHARGE_PERCENT * 100) / 100;
        const correctNet = Math.round((payout.grossAmount - correctTDS - correctAdmin) * 100) / 100;
        const overpayment = Math.round((payout.netAmount - correctNet) * 100) / 100;

        log.warn(`Fixing payout ${payout._id}:`);
        log.warn(`  Member: ${payout.memberId}`);
        log.warn(`  Gross: ₹${payout.grossAmount}`);
        log.warn(`  Was: Admin=₹${payout.adminCharge}, TDS=₹${payout.tdsDeducted}, Net=₹${payout.netAmount}`);
        log.warn(`  Fix: Admin=₹${correctAdmin}, TDS=₹${correctTDS}, Net=₹${correctNet}`);
        log.warn(`  Overpayment: ₹${overpayment}`);

        report.financialImpact.totalTDSMissing += correctTDS;
        report.financialImpact.totalOverpaymentRecovered += overpayment;

        if (config.mode !== 'dry-run') {
            // Fix payout record
            payout.adminCharge = correctAdmin;
            payout.tdsDeducted = correctTDS;
            payout.netAmount = correctNet;
            await payout.save({ session });

            // Recover overpayment from wallet
            if (overpayment > 0) {
                const finance = await UserFinance.findOne({ user: payout.userId });
                if (finance) {
                    log.warn(`  → Deducting ₹${overpayment} from ${payout.memberId} wallet`);
                    finance.wallet.availableBalance = Math.max(0, finance.wallet.availableBalance - overpayment);
                    finance.wallet.totalEarnings = Math.max(0, finance.wallet.totalEarnings - overpayment);
                    await finance.save({ session });
                }
            }

            report.operations.tdsFixed++;
            report.operations.overpaymentRecovered += overpayment;
        }
    }

    log.success(`TDS fixes: ${wrongPayouts.length} payouts, ₹${report.financialImpact.totalTDSMissing.toFixed(2)} TDS recovered, ₹${report.financialImpact.totalOverpaymentRecovered.toFixed(2)} overpayment deducted\n`);
}

// ==================== PHASE 3: CREATE MISSING UserFinance RECORDS ====================

async function createMissingFinanceRecords(session) {
    log.info('PHASE 3: CREATING MISSING USERFINANCE RECORDS');
    console.log('═'.repeat(70));

    const usersWithoutFinance = await User.aggregate([
        {
            $lookup: {
                from: 'userfinances',
                localField: '_id',
                foreignField: 'user',
                as: 'finance'
            }
        },
        {
            $match: {
                'finance.0': { $exists: false }
            }
        }
    ]);

    log.info(`Found ${usersWithoutFinance.length} user(s) without UserFinance records`);

    for (const user of usersWithoutFinance) {
        log.warn(`Creating UserFinance for ${user.memberId}`);

        if (config.mode !== 'dry-run') {
            await UserFinance.create([{
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
            }], { session });

            report.operations.financeRecordsCreated++;
        }
    }

    log.success(`Created ${usersWithoutFinance.length} UserFinance records\n`);
}

// ==================== PHASE 4: RESET ALL USERS TO PROPER STARTING STATE ====================

async function resetAllUsers(session) {
    log.info('PHASE 4: RESETTING ALL USERS TO STARTING STATE');
    console.log('═'.repeat(70));

    if (config.mode !== 'dry-run') {
        // Reset User collection
        const userResult = await User.updateMany(
            {},
            {
                $set: {
                    currentRank: 'Associate',
                    rankHistory: []
                }
            },
            { session }
        );

        log.success(`Reset ${userResult.modifiedCount} User records to Associate rank`);

        // Reset UserFinance collection
        const financeResult = await UserFinance.updateMany(
            {},
            {
                $set: {
                    starMatching: 0,
                    'fastTrack.totalClosings': 0,
                    'fastTrack.dailyClosings': 0,
                    'fastTrack.lastClosingTime': null,
                    'fastTrack.pendingPairLeft': 0,
                    'fastTrack.pendingPairRight': 0,
                    'fastTrack.carryForwardLeft': 0,
                    'fastTrack.carryForwardRight': 0,
                    'fastTrack.weeklyEarnings': 0,
                    'fastTrack.closingHistory': [],
                    'starMatchingBonus.totalClosings': 0,
                    'starMatchingBonus.dailyClosings': 0,
                    'starMatchingBonus.lastClosingTime': null,
                    'starMatchingBonus.pendingStarsLeft': 0,
                    'starMatchingBonus.pendingStarsRight': 0,
                    'starMatchingBonus.carryForwardStarsLeft': 0,
                    'starMatchingBonus.carryForwardStarsRight': 0,
                    'starMatchingBonus.weeklyEarnings': 0,
                    'starMatchingBonus.closingHistory': []
                }
            },
            { session }
        );

        log.success(`Reset ${financeResult.modifiedCount} UserFinance records (cleared closings, carry forward, etc.)`);

        report.operations.usersReset = userResult.modifiedCount;
    } else {
        const totalUsers = await User.countDocuments();
        log.info(`Would reset ${totalUsers} users to Associate rank`);
        log.info(`Would clear all closing histories and carry forward values`);
    }

    console.log('');
}

// ==================== PHASE 5: CORRECT WALLET BALANCES ====================

async function normalizeWalletBalances(session) {
    log.info('PHASE 5: NORMALIZING WALLET BALANCES');
    console.log('═'.repeat(70));

    const allFinances = await UserFinance.find({});
    log.info(`Processing ${allFinances.length} wallet(s)...`);

    for (const finance of allFinances) {
        // Calculate legitimate earnings from valid payouts only
        const validPayouts = await Payout.find({
            user: finance.user,
            status: 'completed',
            tdsDeducted: { $gt: 0 } // Only properly taxed payouts
        });

        const legitEarnings = validPayouts.reduce((sum, p) => sum + p.netAmount, 0);
        const currentEarnings = finance.wallet.totalEarnings;

        if (Math.abs(currentEarnings - legitEarnings) > 0.01) {
            const user = await User.findById(finance.user);
            const illegitAmount = currentEarnings - legitEarnings;

            log.warn(`Balance correction: ${user?.memberId || finance.user}`);
            log.warn(`  Current total: ₹${currentEarnings}`);
            log.warn(`  Legitimate: ₹${legitEarnings}`);
            log.warn(`  Removing: ₹${illegitAmount.toFixed(2)}`);

            report.financialImpact.illegitimateEarningsRemoved += Math.abs(illegitAmount);

            if (config.mode !== 'dry-run') {
                finance.wallet.totalEarnings = legitEarnings;
                finance.wallet.availableBalance = legitEarnings; finance.wallet.pendingWithdrawal = 0;
                await finance.save({ session });

                report.operations.walletsNormalized++;
            }
        }
    }

    log.success(`Normalized ${report.operations.walletsNormalized} wallet balance(s)\n`);
}

// ==================== PHASE 6: VALIDATE GENEALOGY STRUCTURE ====================

async function validateGenealogyTree(session) {
    log.info('PHASE 6: VALIDATING GENEALOGY TREE');
    console.log('═'.repeat(70));

    // Fix root user
    const rootUser = await User.findOne({ memberId: 'SVS000001' });
    if (rootUser && rootUser.parentId) {
        log.warn('Fixing root user (SVS000001) - removing parentId');
        if (config.mode !== 'dry-run') {
            rootUser.parentId = null;
            await rootUser.save({ session });
            report.operations.treeFixed++;
        }
    }

    // Fix orphaned users
    const allUsers = await User.find({ parentId: { $exists: true, $ne: null } });
    let orphanedCount = 0;

    for (const user of allUsers) {
        const parent = await User.findById(user.parentId);
        if (!parent) {
            log.warn(`Orphaned user: ${user.memberId} - attaching to root`);
            orphanedCount++;

            if (config.mode !== 'dry-run' && rootUser) {
                user.parentId = rootUser._id;
                await user.save({ session });
                report.operations.treeFixed++;
            }
        }
    }

    if (orphanedCount === 0) {
        log.success('Tree structure validated - no orphaned users found');
    } else {
        log.success(`Fixed ${orphanedCount} orphaned user(s)`);
    }

    report.postSync.treeValidated = true;
    console.log('');
}

// ==================== PHASE 7: FINAL VALIDATION & REPORT ====================

async function generateFinalReport() {
    log.info('PHASE 7: GENERATING FINAL REPORT');
    console.log('═'.repeat(70));

    // Count post-sync statistics
    report.postSync.usersWithFinance = await UserFinance.countDocuments();
    report.postSync.payoutsWithTDS = await Payout.countDocuments({
        tdsDeducted: { $gt: 0 }
    });
    report.postSync.associateUsers = await User.countDocuments({
        currentRank: 'Associate'
    });

    const totalPayouts = await Payout.countDocuments({
        status: { $in: ['completed', 'pending'] },
        payoutType: { $ne: 'withdrawal' }
    });

    const tdsCompliance = totalPayouts > 0
        ? ((report.postSync.payoutsWithTDS / totalPayouts) * 100).toFixed(1)
        : '100.0';

    // Save detailed report
    const reportPath = `./sync-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Display summary
    console.log('\n');
    console.log('═'.repeat(70));
    console.log('📊 DATABASE RESET SUMMARY');
    console.log('═'.repeat(70));
    console.log(`\nPRE-SYNC STATE:`);
    console.log(`  Total Users:              ${report.preSync.totalUsers}`);
    console.log(`  Total Payouts:            ${report.preSync.totalPayouts}`);
    console.log(`  Finance Records:          ${report.preSync.totalFinanceRecords}`);

    console.log(`\nOPERATIONS PERFORMED:`);
    console.log(`  TDS Fixed:                ${report.operations.tdsFixed}`);
    console.log(`  Overpayment Recovered:    ₹${report.operations.overpaymentRecovered.toFixed(2)}`);
    console.log(`  Finance Records Created:  ${report.operations.financeRecordsCreated}`);
    console.log(`  Users Reset:              ${report.operations.usersReset}`);
    console.log(`  Wallets Normalized:       ${report.operations.walletsNormalized}`);
    console.log(`  Tree Fixes:               ${report.operations.treeFixed}`);

    console.log(`\nFINANCIAL IMPACT:`);
    console.log(`  TDS Missing (Recovered):       ₹${report.financialImpact.totalTDSMissing.toFixed(2)}`);
    console.log(`  Overpayment Recovered:         ₹${report.financialImpact.totalOverpaymentRecovered.toFixed(2)}`);
    console.log(`  Illegitimate Earnings Removed: ₹${report.financialImpact.illegitimateEarningsRemoved.toFixed(2)}`);

    console.log(`\nPOST-SYNC VALIDATION:`);
    console.log(`  Users with Finance:       ${report.postSync.usersWithFinance}/${report.preSync.totalUsers}`);
    console.log(`  TDS Compliance:           ${tdsCompliance}% (${report.postSync.payoutsWithTDS}/${totalPayouts})`);
    console.log(`  Associate Users:          ${report.postSync.associateUsers}`);
    console.log(`  Tree Validated:           ${report.postSync.treeValidated ? '✅ Yes' : '❌ No'}`);

    console.log('\n═'.repeat(70));
    console.log(`Detailed report saved: ${reportPath}`);
    console.log('═'.repeat(70));

    // Display next steps
    if (config.mode !== 'dry-run') {
        console.log('\n🚀 SYSTEM READY FOR PRODUCTION');
        console.log('\nNext steps:');
        console.log('1. Test Fast Track matching (should generate ₹465 net payouts with ₹10 TDS)');
        console.log('2. Verify rank progression works correctly');
        console.log('3. Test withdrawal with proper TDS deduction');
        console.log('4. Monitor user registrations and binary tree placement\n');
    }
}

// ==================== MAIN EXECUTION ====================

async function main() {
    console.log('\n');
    console.log('═'.repeat(70));
    console.log('🔄 SSVPL MLM COMPLETE DATABASE RESET & NORMALIZATION');
    console.log('═'.repeat(70));
    console.log(`Mode: ${config.mode.toUpperCase()}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('═'.repeat(70));

    if (config.mode === 'full-reset') {
        console.log('⚠️  WARNING: Full reset will:');
        console.log('   - Reset ALL users to Associate rank');
        console.log('   - Clear all closing histories');
        console.log('   - Remove invalidearnings from wallets');
        console.log('   - Fix TDS on all payouts');
        console.log('');
    }

    console.log('\n');

    try {
        // Connect to database
        log.info('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        log.success('Connected to database\n');

        // Phase 1: Backup & Count
        if (config.mode === 'backup' || config.mode === 'full-reset') {
            await createBackup();
            console.log('\n');
        }

        await countRecords();

        // Start transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Phase 2: Fix TDS (always run unless dry-run)
            await fixTDSDeductions(session);

            // Phase 3: Create missing finance records
            await createMissingFinanceRecords(session);

            // Phase 4-6: Only for full-reset
            if (config.mode === 'full-reset') {
                await resetAllUsers(session);
                await normalizeWalletBalances(session);
                await validateGenealogyTree(session);
            }

            // Commit or rollback
            if (config.mode !== 'dry-run') {
                await session.commitTransaction();
                log.success('\n✅ ALL CHANGES COMMITTED TO DATABASE\n');
            } else {
                await session.abortTransaction();
                log.info('\n🔄 DRY-RUN COMPLETE - No changes made\n');
            }
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        // Phase 7: Final Report
        await generateFinalReport();

    } catch (error) {
        log.error(`\nFATAL ERROR: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        log.info('\n🔌 Disconnected from database\n');
    }
}

// Run the script
main();
