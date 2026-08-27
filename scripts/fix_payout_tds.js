import mongoose from 'mongoose';
import Payout from '../src/models/Payout.model.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Fix TDS Deduction in Existing Payout Records
 * 
 * This script recalculates TDS for all existing payout records where:
 * - TDS should be 2% of grossAmount
 * - Admin charge should be 5% of grossAmount
 * - Net amount should be grossAmount - adminCharge - tdsDeducted
 * 
 * This fixes payouts created before TDS was properly implemented.
 */

const fixPayoutTDS = async () => {
    const ADMIN_CHARGE_PERCENT = 0.05;
    const TDS_PERCENT = 0.02;

    let stats = {
        totalPayouts: 0,
        payoutsWithWrongTDS: 0,
        payoutsFixed: 0,
        deductionRecords: 0,
        withdrawalRecords: 0,
        errors: 0
    };

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database\n');
        console.log('🔧 Starting TDS Fix for Payout Records...');
        console.log('═'.repeat(70));

        // Get all payouts
        const allPayouts = await Payout.find({});
        stats.totalPayouts = allPayouts.length;
        console.log(`\n📊 Found ${stats.totalPayouts} payout records\n`);

        for (const payout of allPayouts) {
            try {
                // Skip deducted or failed payouts (they don't pay out, so TDS doesn't apply)
                if (payout.status === 'deducted' || payout.status === 'failed') {
                    stats.deductionRecords++;
                    continue;
                }

                // Skip withdrawal requests (they have different TDS logic)
                if (payout.payoutType === 'withdrawal') {
                    stats.withdrawalRecords++;
                    continue;
                }

                // Calculate correct values
                const correctAdminCharge = Math.round(payout.grossAmount * ADMIN_CHARGE_PERCENT * 100) / 100;
                const correctTDS = Math.round(payout.grossAmount * TDS_PERCENT * 100) / 100;
                const correctNetAmount = Math.round((payout.grossAmount - correctAdminCharge - correctTDS) * 100) / 100;

                // Check if current values are wrong
                const needsFix =
                    payout.tdsDeducted !== correctTDS ||
                    payout.adminCharge !== correctAdminCharge ||
                    payout.netAmount !== correctNetAmount;

                if (needsFix) {
                    console.log(`\n⚠️  Found incorrect payout: ${payout._id}`);
                    console.log(`   Type: ${payout.payoutType}`);
                    console.log(`   Member: ${payout.memberId}`);
                    console.log(`   Gross: ₹${payout.grossAmount}`);
                    console.log(`   OLD VALUES:`);
                    console.log(`     Admin Charge: ₹${payout.adminCharge} (should be ₹${correctAdminCharge})`);
                    console.log(`     TDS: ₹${payout.tdsDeducted} (should be ₹${correctTDS})`);
                    console.log(`     Net: ₹${payout.netAmount} (should be ₹${correctNetAmount})`);

                    // Update the payout
                    payout.adminCharge = correctAdminCharge;
                    payout.tdsDeducted = correctTDS;
                    payout.netAmount = correctNetAmount;
                    await payout.save();

                    console.log(`   ✅ FIXED!`);
                    stats.payoutsFixed++;
                    stats.payoutsWithWrongTDS++;
                }

            } catch (error) {
                console.error(`   ❌ Error fixing payout ${payout._id}:`, error.message);
                stats.errors++;
            }
        }

        // Summary
        console.log('\n');
        console.log('═'.repeat(70));
        console.log('📊 TDS FIX SUMMARY');
        console.log('═'.repeat(70));
        console.log(`Total Payouts Scanned:           ${stats.totalPayouts}`);
        console.log(`Payouts with Wrong TDS:          ${stats.payoutsWithWrongTDS}`);
        console.log(`Payouts Fixed:                   ${stats.payoutsFixed}`);
        console.log(`Deduction Records (Skipped):     ${stats.deductionRecords}`);
        console.log(`Withdrawal Records (Skipped):    ${stats.withdrawalRecords}`);
        console.log(`Errors:                          ${stats.errors}`);
        console.log('═'.repeat(70));

        if (stats.payoutsFixed > 0) {
            console.log(`\n✅ Successfully fixed ${stats.payoutsFixed} payout records!`);
        } else {
            console.log('\n✅ All payout records are already correct!');
        }

        // Show corrected deduction formula
        console.log('\n📋 Deduction Formula Applied:');
        console.log(`   Admin Charge: 5% of Gross Amount`);
        console.log(`   TDS:          2% of Gross Amount`);
        console.log(`   Net Amount:   Gross - Admin Charge - TDS`);
        console.log(`   Example:      ₹500 - ₹25 (5%) - ₹10 (2%) = ₹465`);

    } catch (error) {
        console.error('\n❌ Script failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
};

// Run the fix
fixPayoutTDS();
