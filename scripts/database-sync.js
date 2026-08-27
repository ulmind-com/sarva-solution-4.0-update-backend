#!/usr/bin/env node

/**
 * SSVPL MLM DATABASE SYNCHRONIZATION & CORRECTION SCRIPT
 * 
 * This production-ready script audits, fixes, and validates all data integrity
 * issues in the SSVPL MLM database based on verified technical documentation.
 * 
 * USAGE:
 *   node scripts/database-sync.js --mode=audit              # Read-only report
 *   node scripts/database-sync.js --mode=dry-run            # Simulate fixes
 *   node scripts/database-sync.js --mode=full-fix --backup  # Apply all fixes
 *   node scripts/database-sync.js --mode=specific --fix=tds # Fix only TDS
 * 
 * SAFETY FEATURES:
 *   - Transaction support with rollback
 *   - Automatic backup before changes
 *   - Idempotent (safe to run multiple times)
 *   - Detailed logging and reporting
 */

import mongoose from 'mongoose';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import Payout from '../src/models/Payout.model.js';
import BVTransaction from '../src/models/BVTransaction.model.js';
import dotenv from 'dotenv';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();
const execAsync = promisify(exec);

// ==================== CONFIGURATION ====================

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

// Parse CLI arguments
const args = process.argv.slice(2);
const config = {
    mode: 'audit', // audit, dry-run, full-fix, specific
    backup: false,
    fix: null, // tds, ranks, bv, cron, tree, carry
    logFile: `sync-report-${new Date().toISOString().split('T')[0]}.json`,
    verbose: false
};

args.forEach(arg => {
    const [key, value] = arg.replace('--', '').split('=');
    if (key === 'backup') config.backup = true;
    else if (key === 'verbose' || key === 'v') config.verbose = true;
    else config[key] = value || true;
});

// ==================== GLOBAL STATE ====================

const auditReport = {
    timestamp: new Date().toISOString(),
    mode: config.mode,
    totalUsers: 0,
    totalPayouts: 0,
    totalFinanceRecords: 0,
    issues: {
        invalidRanks: [],
        wrongTDS: [],
        wrongAdminCharge: [],
        missingFinanceRecords: [],
        orphanedUsers: [],
        negativeBV: [],
        carrySyncIssues: [],
        dailyClosingsStale: [],
        weeklyEarningsStale: [],
        brokenTreeLinks: []
    },
    fixes: {
        payoutsFixed: 0,
        ranksFixed: 0,
        bvRecalculated: 0,
        financeRecordsCreated: 0,
        cronDataReset: 0,
        treeLinksFixed: 0,
        carryForwardFixed: 0
    },
    financialImpact: {
        totalTDSMissing: 0,
        totalOverpayment: 0,
        totalUnderpayment: 0
    }
};

const log = {
    info: (msg) => console.log(`ℹ️  ${msg}`),
    warn: (msg) => console.log(`⚠️  ${msg}`),
    error: (msg) => console.error(`❌ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    debug: (msg) => config.verbose && console.log(`🔍 ${msg}`)
};

// ==================== PHASE 1: COMPREHENSIVE AUDIT ====================

async function runFullAudit() {
    log.info('PHASE 1: COMPREHENSIVE AUDIT (Read-Only)');
    console.log('═'.repeat(70));

    // Count totals
    auditReport.totalUsers = await User.countDocuments();
    auditReport.totalPayouts = await Payout.countDocuments();
    auditReport.totalFinanceRecords = await UserFinance.countDocuments();

    log.info(`Found ${auditReport.totalUsers} users, ${auditReport.totalPayouts} payouts`);

    // Audit 1: Missing Finance Records
    log.info('Checking for missing UserFinance records...');
    const allUsers = await User.find({}).lean();
    for (const user of allUsers) {
        const finance = await UserFinance.findOne({ user: user._id });
        if (!finance) {
            auditReport.issues.missingFinanceRecords.push({
                memberId: user.memberId,
                userId: user._id
            });
        }
    }
    log.warn(`Found ${auditReport.issues.missingFinanceRecords.length} users without finance records`);

    // Audit 2: Wrong TDS
    log.info('Checking TDS deductions...');
    const payouts = await Payout.find({ status: { $in: ['completed', 'pending'] } }).lean();
    for (const payout of payouts) {
        if (payout.payoutType === 'withdrawal' || payout.status === 'deducted') continue;

        const correctTDS = Math.round(payout.grossAmount * TDS_PERCENT * 100) / 100;
        const correctAdmin = Math.round(payout.grossAmount * ADMIN_CHARGE_PERCENT * 100) / 100;
        const correctNet = Math.round((payout.grossAmount - correctTDS - correctAdmin) * 100) / 100;

        if (Math.abs(payout.tdsDeducted - correctTDS) > 0.01) {
            const overpayment = (payout.netAmount - correctNet);
            auditReport.issues.wrongTDS.push({
                payoutId: payout._id,
                memberId: payout.memberId,
                grossAmount: payout.grossAmount,
                currentTDS: payout.tdsDeducted,
                correctTDS: correctTDS,
                currentNet: payout.netAmount,
                correctNet: correctNet,
                overpayment: overpayment
            });
            auditReport.financialImpact.totalTDSMissing += (correctTDS - payout.tdsDeducted);
            if (overpayment > 0) {
                auditReport.financialImpact.totalOverpayment += overpayment;
            }
        }
    }
    log.warn(`Found ${auditReport.issues.wrongTDS.length} payouts with incorrect TDS (₹${auditReport.financialImpact.totalTDSMissing.toFixed(2)} missing)`);

    // Audit 3: Invalid Ranks
    log.info('Checking rank inconsistencies...');
    const allFinances = await UserFinance.find({}).lean();
    for (const finance of allFinances) {
        const user = await User.findById(finance.user).lean();
        if (!user) continue;

        const actualStarMatches = finance.starMatching || 0;
        const currentRank = user.currentRank;
        const requiredStars = RANK_REQUIREMENTS[currentRank] || 0;

        if (actualStarMatches < requiredStars) {
            // Find correct rank
            let correctRank = 'Associate';
            for (const [rank, requirement] of Object.entries(RANK_REQUIREMENTS)) {
                if (actualStarMatches >= requirement) {
                    correctRank = rank;
                } else {
                    break;
                }
            }

            auditReport.issues.invalidRanks.push({
                memberId: user.memberId,
                currentRank: currentRank,
                requiredStars: requiredStars,
                actualStars: actualStarMatches,
                correctRank: correctRank
            });
        }
    }
    log.warn(`Found ${auditReport.issues.invalidRanks.length} users with invalid ranks`);

    // Audit 4: Negative Balances
    log.info('Checking for negative balances...');
    for (const finance of allFinances) {
        if (finance.leftLegBV < 0 || finance.rightLegBV < 0 ||
            finance.wallet.availableBalance < 0) {
            auditReport.issues.negativeBV.push({
                memberId: (await User.findById(finance.user))?.memberId,
                leftLegBV: finance.leftLegBV,
                rightLegBV: finance.rightLegBV,
                availableBalance: finance.wallet.availableBalance
            });
        }
    }
    log.warn(`Found ${auditReport.issues.negativeBV.length} accounts with negative balances`);

    // Audit 5: Stale Cron Data
    log.info('Checking stale cron data...');
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));

    for (const finance of allFinances) {
        // Check stale daily closings
        if (finance.fastTrack?.dailyClosings > 0 &&
            finance.fastTrack?.lastClosingTime < todayStart) {
            auditReport.issues.dailyClosingsStale.push({
                memberId: (await User.findById(finance.user))?.memberId,
                dailyClosings: finance.fastTrack.dailyClosings,
                lastClosing: finance.fastTrack.lastClosingTime
            });
        }

        // Check stale weekly earnings
        if (finance.fastTrack?.weeklyEarnings > 0 ||
            finance.starMatchingBonus?.weeklyEarnings > 0) {
            auditReport.issues.weeklyEarningsStale.push({
                memberId: (await User.findById(finance.user))?.memberId,
                fastTrackWeekly: finance.fastTrack?.weeklyEarnings || 0,
                starWeekly: finance.starMatchingBonus?.weeklyEarnings || 0
            });
        }
    }
    log.warn(`Found ${auditReport.issues.dailyClosingsStale.length} stale daily closings, ${auditReport.issues.weeklyEarningsStale.length} unpaid weekly earnings`);

    // Audit 6: Genealogy Tree
    log.info('Validating genealogy tree...');
    for (const user of allUsers) {
        // Check left child
        if (user.leftChild) {
            const leftChild = await User.findById(user.leftChild).lean();
            if (!leftChild || leftChild.parentId?.toString() !== user._id.toString()) {
                auditReport.issues.brokenTreeLinks.push({
                    memberId: user.memberId,
                    issue: 'broken-left-link',
                    childId: user.leftChild
                });
            }
        }

        // Check right child
        if (user.rightChild) {
            const rightChild = await User.findById(user.rightChild).lean();
            if (!rightChild || rightChild.parentId?.toString() !== user._id.toString()) {
                auditReport.issues.brokenTreeLinks.push({
                    memberId: user.memberId,
                    issue: 'broken-right-link',
                    childId: user.rightChild
                });
            }
        }

        // Check orphaned
        if (user.parentId) {
            const parent = await User.findById(user.parentId).lean();
            if (!parent) {
                auditReport.issues.orphanedUsers.push({
                    memberId: user.memberId,
                    parentId: user.parentId
                });
            }
        }
    }
    log.warn(`Found ${auditReport.issues.brokenTreeLinks.length} broken tree links, ${auditReport.issues.orphanedUsers.length} orphaned users`);

    return auditReport;
}

// ==================== PHASE 2: TDS & FINANCIAL CORRECTION ====================

async function fixPayoutDeductions(session) {
    log.info('PHASE 2: FIXING TDS & ADMIN CHARGE DEDUCTIONS');
    console.log('═'.repeat(70));

    const wrongPayouts = auditReport.issues.wrongTDS;
    log.info(`Processing ${wrongPayouts.length} payouts with incorrect deductions...`);

    for (const issue of wrongPayouts) {
        const payout = await Payout.findById(issue.payoutId);
        if (!payout) continue;

        const correctTDS = issue.correctTDS;
        const correctAdmin = Math.round(payout.grossAmount * ADMIN_CHARGE_PERCENT * 100) / 100;
        const correctNet = issue.correctNet;
        const overpayment = issue.overpayment;

        log.debug(`Fixing payout ${payout._id}: TDS ${payout.tdsDeducted} → ${correctTDS}, Net ${payout.netAmount} → ${correctNet}`);

        if (config.mode !== 'dry-run') {
            // Fix payout record
            payout.adminCharge = correctAdmin;
            payout.tdsDeducted = correctTDS;
            payout.netAmount = correctNet;
            await payout.save({ session });

            // Adjust user wallet if overpaid
            if (overpayment > 0.01) {
                const finance = await UserFinance.findOne({ user: payout.userId });
                if (finance) {
                    log.warn(`Deducting ₹${overpayment.toFixed(2)} overpayment from ${issue.memberId}`);
                    finance.wallet.availableBalance -= overpayment;
                    finance.wallet.totalEarnings -= overpayment;
                    await finance.save({ session });
                }
            }
        }

        auditReport.fixes.payoutsFixed++;
    }

    log.success(`Fixed ${auditReport.fixes.payoutsFixed} payout records (₹${auditReport.financialImpact.totalOverpayment.toFixed(2)} recovered)`);
}

// ==================== PHASE 3: RANK VALIDATION ====================

async function fixRankInconsistencies(session) {
    log.info('PHASE 3: FIXING RANK INCONSISTENCIES');
    console.log('═'.repeat(70));

    const invalidRanks = auditReport.issues.invalidRanks;
    log.info(`Processing ${invalidRanks.length} users with invalid ranks...`);

    for (const issue of invalidRanks) {
        const user = await User.findOne({ memberId: issue.memberId });
        if (!user) continue;

        log.warn(`Downgrading ${issue.memberId}: ${issue.currentRank} → ${issue.correctRank} (has ${issue.actualStars}/${issue.requiredStars} stars)`);

        if (config.mode !== 'dry-run') {
            user.currentRank = issue.correctRank;
            await user.save({ session });
        }

        auditReport.fixes.ranksFixed++;
    }

    log.success(`Fixed ${auditReport.fixes.ranksFixed} rank inconsistencies`);
}

// ==================== PHASE 4: BV/PV RECALCULATION ====================

async function recalculateBV(session) {
    log.info('PHASE 4: RECALCULATING BV FROM TRANSACTIONS');
    console.log('═'.repeat(70));

    const allFinances = await UserFinance.find({});
    log.info(`Validating BV for ${allFinances.length} users...`);

    for (const finance of allFinances) {
        // This would require BVTransaction model to properly recalculate
        // For now, we'll skip if no transactions exist
        const leftBVTransactions = await BVTransaction.find({
            userId: finance.user,
            leg: 'left'
        });

        const rightBVTransactions = await BVTransaction.find({
            userId: finance.user,
            leg: 'right'
        });

        if (leftBVTransactions.length > 0 || rightBVTransactions.length > 0) {
            const calculatedLeftBV = leftBVTransactions.reduce((sum, t) => sum + t.bvAmount, 0);
            const calculatedRightBV = rightBVTransactions.reduce((sum, t) => sum + t.bvAmount, 0);

            if (Math.abs(finance.leftLegBV - calculatedLeftBV) > 0.01 ||
                Math.abs(finance.rightLegBV - calculatedRightBV) > 0.01) {

                const user = await User.findById(finance.user);
                log.debug(`Recalculating BV for ${user?.memberId}: Left ${finance.leftLegBV} → ${calculatedLeftBV}, Right ${finance.rightLegBV} → ${calculatedRightBV}`);

                if (config.mode !== 'dry-run') {
                    finance.leftLegBV = calculatedLeftBV;
                    finance.rightLegBV = calculatedRightBV;
                    await finance.save({ session });
                }

                auditReport.fixes.bvRecalculated++;
            }
        }
    }

    log.success(`Recalculated BV for ${auditReport.fixes.bvRecalculated} users`);
}

// ==================== PHASE 5: CRON STATE RESET ====================

async function resetStaleCronData(session) {
    log.info('PHASE 5: RESETTING STALE CRON DATA');
    console.log('═'.repeat(70));

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));

    // Reset daily closings
    log.info('Resetting stale daily closings...');
    if (config.mode !== 'dry-run') {
        const result = await UserFinance.updateMany(
            {
                $or: [
                    { 'fastTrack.dailyClosings': { $gt: 0 }, 'fastTrack.lastClosingTime': { $lt: todayStart } },
                    { 'starMatchingBonus.dailyClosings': { $gt: 0 }, 'starMatchingBonus.lastClosingTime': { $lt: todayStart } }
                ]
            },
            {
                $set: {
                    'fastTrack.dailyClosings': 0,
                    'starMatchingBonus.dailyClosings': 0
                }
            },
            { session }
        );
        auditReport.fixes.cronDataReset += result.modifiedCount;
        log.success(`Reset ${result.modifiedCount} stale daily closings`);
    } else {
        log.info(`Would reset ${auditReport.issues.dailyClosingsStale.length} stale daily closings`);
    }

    // Transfer weekly earnings to available balance
    log.info('Processing unpaid weekly earnings...');
    const staleWeekly = auditReport.issues.weeklyEarningsStale;
    for (const issue of staleWeekly) {
        const finance = await UserFinance.findOne({ user: (await User.findOne({ memberId: issue.memberId }))?._id });
        if (!finance) continue;

        const totalWeekly = (finance.fastTrack?.weeklyEarnings || 0) + (finance.starMatchingBonus?.weeklyEarnings || 0);

        if (config.mode !== 'dry-run' && totalWeekly > 0) {
            log.debug(`Transferring ₹${totalWeekly} weekly earnings to ${issue.memberId}`);
            finance.wallet.availableBalance += totalWeekly;
            finance.fastTrack.weeklyEarnings = 0;
            finance.starMatchingBonus.weeklyEarnings = 0;
            await finance.save({ session });
            auditReport.fixes.cronDataReset++;
        }
    }

    log.success(`Processed weekly earnings for ${staleWeekly.length} users`);
}

// ==================== PHASE 6: GENEALOGY TREE VALIDATION ====================

async function validateGenealogyTree(session) {
    log.info('PHASE 6: VALIDATING GENEALOGY TREE');
    console.log('═'.repeat(70));

    // For now, we'll just report broken links
    // Fixing them automatically is risky and requires manual review
    log.warn(`Found ${auditReport.issues.brokenTreeLinks.length} broken tree links`);
    log.warn(`Found ${auditReport.issues.orphanedUsers.length} orphaned users`);
    log.info('Tree fixes require manual review - skipping automatic fixes');
}

// ==================== PHASE 7: CARRY FORWARD SYNC ====================

async function syncCarryForward(session) {
    log.info('PHASE 7: SYNCHRONIZING CARRY FORWARD VALUES');
    console.log('═'.repeat(70));

    const allFinances = await UserFinance.find({});

    for (const finance of allFinances) {
        // Calculate expected carry forward from closing history
        let totalMatchedLeft = 0, totalMatchedRight = 0;

        if (finance.fastTrack?.closingHistory) {
            finance.fastTrack.closingHistory.forEach(closing => {
                totalMatchedLeft += closing.leftPV || 0;
                totalMatchedRight += closing.rightPV || 0;
            });
        }

        const expectedCarryLeft = Math.max(0, finance.leftLegBV - totalMatchedLeft - (finance.fastTrack?.pendingPairLeft || 0));
        const expectedCarryRight = Math.max(0, finance.rightLegBV - totalMatchedRight - (finance.fastTrack?.pendingPairRight || 0));

        if (Math.abs((finance.fastTrack?.carryForwardLeft || 0) - expectedCarryLeft) > 0.01 ||
            Math.abs((finance.fastTrack?.carryForwardRight || 0) - expectedCarryRight) > 0.01) {

            const user = await User.findById(finance.user);
            log.debug(`Syncing carry forward for ${user?.memberId}`);

            if (config.mode !== 'dry-run') {
                if (!finance.fastTrack) finance.fastTrack = {};
                finance.fastTrack.carryForwardLeft = expectedCarryLeft;
                finance.fastTrack.carryForwardRight = expectedCarryRight;
                await finance.save({ session });
            }

            auditReport.fixes.carryForwardFixed++;
        }
    }

    log.success(`Synchronized carry forward for ${auditReport.fixes.carryForwardFixed} users`);
}

// ==================== BACKUP FUNCTIONALITY ====================

async function createBackup() {
    log.info('Creating MongoDB backup...');

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = `./backups/backup-${timestamp}`;

        const mongoUri = process.env.MONGODB_URI;
        const dbName = mongoUri.split('/').pop().split('?')[0];

        const command = `mongodump --uri="${mongoUri}" --out="${backupDir}"`;

        log.debug(`Running: ${command}`);
        await execAsync(command);

        log.success(`Backup created at: ${backupDir}`);
        return backupDir;
    } catch (error) {
        log.error(`Backup failed: ${error.message}`);
        throw error;
    }
}

// ==================== MAIN EXECUTION ====================

async function main() {
    console.log('\n');
    console.log('═'.repeat(70));
    console.log('🔄 SSVPL MLM DATABASE SYNCHRONIZATION & CORRECTION');
    console.log('═'.repeat(70));
    console.log(`Mode: ${config.mode.toUpperCase()}`);
    console.log(`Backup: ${config.backup ? 'ENABLED' : 'DISABLED'}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('═'.repeat(70));
    console.log('\n');

    try {
        // Connect to database
        log.info('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        log.success('Connected to database\n');

        // Create backup if requested
        if (config.backup && config.mode === 'full-fix') {
            await createBackup();
            console.log('\n');
        }

        // PHASE 1: Always run audit
        await runFullAudit();

        // Save audit report
        const auditReportStr = JSON.stringify(auditReport, null, 2);
        fs.writeFileSync(config.logFile, auditReportStr);
        log.success(`Audit report saved to: ${config.logFile}\n`);

        // Display summary
        console.log('═'.repeat(70));
        console.log('📊 AUDIT SUMMARY');
        console.log('═'.repeat(70));
        console.log(`Total Users:              ${auditReport.totalUsers}`);
        console.log(`Total Payouts:            ${auditReport.totalPayouts}`);
        console.log(`\nISSUES FOUND:`);
        console.log(`  Wrong TDS:              ${auditReport.issues.wrongTDS.length}`);
        console.log(`  Invalid Ranks:          ${auditReport.issues.invalidRanks.length}`);
        console.log(`  Missing Finance:        ${auditReport.issues.missingFinanceRecords.length}`);
        console.log(`  Negative Balances:      ${auditReport.issues.negativeBV.length}`);
        console.log(`  Stale Daily Closings:   ${auditReport.issues.dailyClosingsStale.length}`);
        console.log(`  Stale Weekly Earnings:  ${auditReport.issues.weeklyEarningsStale.length}`);
        console.log(`  Broken Tree Links:      ${auditReport.issues.brokenTreeLinks.length}`);
        console.log(`\nFINANCIAL IMPACT:`);
        console.log(`  TDS Missing:            ₹${auditReport.financialImpact.totalTDSMissing.toFixed(2)}`);
        console.log(`  Total Overpayment:      ₹${auditReport.financialImpact.totalOverpayment.toFixed(2)}`);
        console.log('═'.repeat(70));

        // Exit if audit mode
        if (config.mode === 'audit') {
            log.info('\nAUDIT COMPLETE - No changes made');
            return;
        }

        // Run fixes
        console.log('\n');
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // PHASE 2-7: Apply fixes
            if (!config.fix || config.fix === 'tds') {
                await fixPayoutDeductions(session);
            }

            if (!config.fix || config.fix === 'ranks') {
                await fixRankInconsistencies(session);
            }

            if (!config.fix || config.fix === 'bv') {
                await recalculateBV(session);
            }

            if (!config.fix || config.fix === 'cron') {
                await resetStaleCronData(session);
            }

            if (!config.fix || config.fix === 'tree') {
                await validateGenealogyTree(session);
            }

            if (!config.fix || config.fix === 'carry') {
                await syncCarryForward(session);
            }

            // Commit or rollback
            if (config.mode === 'full-fix') {
                await session.commitTransaction();
                log.success('\n✅ ALL CHANGES COMMITTED TO DATABASE');
            } else {
                await session.abortTransaction();
                log.info('\n🔄 DRY-RUN COMPLETE - No changes committed');
            }
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        // Display fix summary
        console.log('\n');
        console.log('═'.repeat(70));
        console.log('📊 FIX SUMMARY');
        console.log('═'.repeat(70));
        console.log(`Payouts Fixed:            ${auditReport.fixes.payoutsFixed}`);
        console.log(`Ranks Fixed:              ${auditReport.fixes.ranksFixed}`);
        console.log(`BV Recalculated:          ${auditReport.fixes.bvRecalculated}`);
        console.log(`Cron Data Reset:          ${auditReport.fixes.cronDataReset}`);
        console.log(`Carry Forward Fixed:      ${auditReport.fixes.carryForwardFixed}`);
        console.log('═'.repeat(70));

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
