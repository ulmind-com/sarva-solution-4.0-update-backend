/**
 * Migration: Self Repurchase Bonus Setup
 * --------------------------------------------------------
 * Safe, idempotent script that:
 *   1. Creates indexes for the three new SRB collections
 *   2. Backfills SelfRepurchaseBVEntry from existing FranchiseSale records
 *      where isFirstPurchase = false
 *
 * DOES NOT modify any existing document.
 * Run ONCE before enabling the Self Repurchase Bonus feature.
 *
 * Usage:
 *   node src/scripts/migrate_self_repurchase.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import moment from 'moment-timezone';
import connectDB from '../config/db.js';

// Resolve .env from the project root (two levels up from src/scripts/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import new models (creates collections + indexes on first access)
import SelfRepurchaseBVEntry from '../models/SelfRepurchaseBVEntry.model.js';
import SelfRepurchaseBonusPool from '../models/SelfRepurchaseBonusPool.model.js';
import SelfRepurchaseWalletCredit from '../models/SelfRepurchaseWalletCredit.model.js';

// Import FranchiseSale to backfill from existing data
import FranchiseSale from '../models/FranchiseSale.model.js';

dotenv.config();

const TIMEZONE = 'Asia/Kolkata';
const ELIGIBILITY_WINDOW_DAY = 17;

const migrate = async () => {
    try {
        await connectDB();
        console.log('✅ DB Connected. Starting SRB Migration...\n');

        // --------------------------------------------------------
        // Step 1: Ensure indexes exist on all three new collections
        // --------------------------------------------------------
        console.log('📋 Step 1: Ensuring indexes on new collections...');
        await SelfRepurchaseBVEntry.createIndexes();
        await SelfRepurchaseBonusPool.createIndexes();
        await SelfRepurchaseWalletCredit.createIndexes();
        console.log('   ✅ Indexes ready.\n');

        // --------------------------------------------------------
        // Step 2: Backfill BV Entries from existing FranchiseSale
        // --------------------------------------------------------
        console.log('📋 Step 2: Backfilling BV entries from existing FranchiseSale records...');

        // Only process non-first-purchase sales with BV > 0
        const sales = await FranchiseSale.find({
            isFirstPurchase: false,
            totalBV: { $gt: 0 }
        })
            .select('saleNo saleDate user memberId totalBV')
            .lean();

        console.log(`   Found ${sales.length} qualifying sale records.\n`);

        let inserted = 0;
        let skipped = 0;
        let errors = 0;

        for (const sale of sales) {
            try {
                const saleMoment = moment(sale.saleDate).tz(TIMEZONE);
                const dayOfMonth = saleMoment.date();
                const month = saleMoment.month() + 1; // 1-indexed
                const year = saleMoment.year();
                const isInEligibilityWindow = dayOfMonth >= 1 && dayOfMonth <= ELIGIBILITY_WINDOW_DAY;

                await SelfRepurchaseBVEntry.create({
                    userId: sale.user,
                    memberId: sale.memberId,
                    saleId: sale.saleNo,
                    bvAmount: sale.totalBV,
                    purchaseDate: sale.saleDate,
                    month,
                    year,
                    isInEligibilityWindow
                });

                inserted++;
            } catch (err) {
                if (err.code === 11000) {
                    // Already seeded (idempotent run)
                    skipped++;
                } else {
                    errors++;
                    console.error(`   ⚠️  Error for sale ${sale.saleNo}: ${err.message}`);
                }
            }
        }

        // --------------------------------------------------------
        // Step 3: Summary
        // --------------------------------------------------------
        console.log('\n========== SRB MIGRATION SUMMARY ==========');
        console.log(`Total sales processed : ${sales.length}`);
        console.log(`BV entries inserted   : ${inserted}`);
        console.log(`Skipped (duplicate)   : ${skipped}`);
        console.log(`Errors                : ${errors}`);
        console.log('============================================\n');

        if (errors > 0) {
            console.warn('⚠️  Migration completed with errors. Review logs above.');
        } else {
            console.log('✅ Migration completed successfully.');
        }

        console.log('\nNew collections created:');
        console.log('  - selfrepurchasebventries');
        console.log('  - selfrepurchasebonuspools');
        console.log('  - selfrepurchasewalletcredits');
        console.log('\nNo existing documents were modified.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
