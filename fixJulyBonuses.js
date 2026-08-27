/**
 * fixJulyBonuses.js
 * 
 * Recovery script for 3 crashed July 2026 bonus computations:
 *   - TourFund
 *   - StartUpBonus
 *   - BeginnerBonus
 *
 * Usage:
 *   DRY RUN (default):  node fixJulyBonuses.js
 *   ACTUAL RUN:         node fixJulyBonuses.js --execute
 */

import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import chalk from 'chalk';

// ── CONFIG ────────────────────────────────────────────────────────────────────
const YEAR  = 2026;
const MONTH = 7;
const DRY_RUN = !process.argv.includes('--execute');
// ──────────────────────────────────────────────────────────────────────────────

const run = async () => {
    try {
        console.log(chalk.cyan('═══════════════════════════════════════════════════════'));
        console.log(chalk.cyan(`  July ${YEAR} Bonus Recovery Script`));
        console.log(chalk.cyan(`  Mode: ${DRY_RUN ? '🔍 DRY-RUN (no changes)' : '🚀 EXECUTE (will modify DB)'}`));
        console.log(chalk.cyan('═══════════════════════════════════════════════════════'));

        console.log(chalk.yellow('\n[Step 0] Connecting to MongoDB...'));
        await connectDB();
        console.log(chalk.green('✅ Connected.\n'));

        // ── Import models for dry-run checks ──────────────────────────────────
        const SelfRepurchaseBVEntry = (await import('./src/models/SelfRepurchaseBVEntry.model.js')).default;

        const TourFundPool           = (await import('./src/models/TourFundPool.model.js')).default;
        const StartUpBonusPool       = (await import('./src/models/StartUpBonusPool.model.js')).default;
        const BeginnerBonusPool      = (await import('./src/models/BeginnerBonusPool.model.js')).default;

        const TourFundWalletCredit        = (await import('./src/models/TourFundWalletCredit.model.js')).default;
        const StartUpBonusWalletCredit    = (await import('./src/models/StartUpBonusWalletCredit.model.js')).default;
        const BeginnerBonusWalletCredit   = (await import('./src/models/BeginnerBonusWalletCredit.model.js')).default;

        // ── Step 1: DRY-RUN CHECKS ───────────────────────────────────────────
        console.log(chalk.yellow('═══════════════════════════════════════════════════════'));
        console.log(chalk.yellow('  STEP 1: Pre-flight DB State Check'));
        console.log(chalk.yellow('═══════════════════════════════════════════════════════\n'));

        // Check BV data exists
        const bvEntries = await SelfRepurchaseBVEntry.find({ year: YEAR, month: MONTH }).lean();
        const totalBV   = bvEntries.reduce((acc, e) => acc + (e.bvAmount || 0), 0);
        console.log(chalk.cyan(`📊 SelfRepurchaseBVEntry records for ${YEAR}-${MONTH}: ${bvEntries.length}`));
        console.log(chalk.cyan(`📊 Total Company BV: ${totalBV}`));

        if (totalBV === 0) {
            console.log(chalk.red('❌ No BV data found! Nothing to compute. Exiting.'));
            process.exit(0);
        }

        // Check existing pool states
        const tourPool      = await TourFundPool.findOne({ year: YEAR, month: MONTH }).lean();
        const startupPool   = await StartUpBonusPool.findOne({ year: YEAR, month: MONTH }).lean();
        const beginnerPool  = await BeginnerBonusPool.findOne({ year: YEAR, month: MONTH }).lean();

        console.log(chalk.cyan(`\n📋 Existing Pool Status:`));
        console.log(`   TourFund Pool:      ${tourPool ? `EXISTS (status: ${tourPool.status})` : '❌ NOT FOUND (will be created)'}`);
        console.log(`   StartUpBonus Pool:  ${startupPool ? `EXISTS (status: ${startupPool.status})` : '❌ NOT FOUND (will be created)'}`);
        console.log(`   BeginnerBonus Pool: ${beginnerPool ? `EXISTS (status: ${beginnerPool.status})` : '❌ NOT FOUND (will be created)'}`);

        // Check if already distributed
        const alreadyDone = [];
        if (tourPool?.status === 'distributed')     alreadyDone.push('TourFund');
        if (startupPool?.status === 'distributed')   alreadyDone.push('StartUpBonus');
        if (beginnerPool?.status === 'distributed')  alreadyDone.push('BeginnerBonus');

        if (alreadyDone.length > 0) {
            console.log(chalk.yellow(`\n⚠️  Already distributed: ${alreadyDone.join(', ')}`));
            console.log(chalk.yellow('   These will be SKIPPED (idempotency check).'));
        }

        // Check existing wallet credits
        const tourCredits     = await TourFundWalletCredit.countDocuments({ year: YEAR, month: MONTH });
        const startupCredits  = await StartUpBonusWalletCredit.countDocuments({ year: YEAR, month: MONTH });
        const beginnerCredits = await BeginnerBonusWalletCredit.countDocuments({ year: YEAR, month: MONTH });

        console.log(chalk.cyan(`\n📋 Existing WalletCredit Records:`));
        console.log(`   TourFund:      ${tourCredits} records`);
        console.log(`   StartUpBonus:  ${startupCredits} records`);
        console.log(`   BeginnerBonus: ${beginnerCredits} records`);

        // ── DRY-RUN STOP ─────────────────────────────────────────────────────
        if (DRY_RUN) {
            console.log(chalk.yellow('\n═══════════════════════════════════════════════════════'));
            console.log(chalk.yellow('  🔍 DRY-RUN COMPLETE — No changes made.'));
            console.log(chalk.yellow('═══════════════════════════════════════════════════════'));
            console.log(chalk.cyan('\n  To execute for real, run:'));
            console.log(chalk.green('  node fixJulyBonuses.js --execute\n'));
            process.exit(0);
        }

        // ══════════════════════════════════════════════════════════════════════
        // ACTUAL EXECUTION STARTS HERE
        // ══════════════════════════════════════════════════════════════════════

        console.log(chalk.magenta('\n═══════════════════════════════════════════════════════'));
        console.log(chalk.magenta('  STEP 2: Running Computations (Month-End Distribution)'));
        console.log(chalk.magenta('═══════════════════════════════════════════════════════\n'));

        // 2a. TourFund Computation
        console.log(chalk.yellow('── [2a] TourFund: runMonthEndDistribution ──────────'));
        try {
            const { tourFundService } = await import('./src/services/business/tourFund.service.js');
            await tourFundService.runMonthEndDistribution(YEAR, MONTH);
            console.log(chalk.green('✅ TourFund computation complete.\n'));
        } catch (err) {
            console.error(chalk.red(`❌ TourFund computation FAILED: ${err.message}`));
            console.error(err.stack);
        }

        // 2b. StartUpBonus Computation
        console.log(chalk.yellow('── [2b] StartUpBonus: runMonthEndDistribution ─────'));
        try {
            const { startUpBonusService } = await import('./src/services/business/startUpBonus.service.js');
            await startUpBonusService.runMonthEndDistribution(YEAR, MONTH);
            console.log(chalk.green('✅ StartUpBonus computation complete.\n'));
        } catch (err) {
            console.error(chalk.red(`❌ StartUpBonus computation FAILED: ${err.message}`));
            console.error(err.stack);
        }

        // 2c. BeginnerBonus Computation
        console.log(chalk.yellow('── [2c] BeginnerBonus: runMonthEndDistribution ────'));
        try {
            const { beginnerBonusService } = await import('./src/services/business/beginnerBonus.service.js');
            await beginnerBonusService.runMonthEndDistribution(YEAR, MONTH);
            console.log(chalk.green('✅ BeginnerBonus computation complete.\n'));
        } catch (err) {
            console.error(chalk.red(`❌ BeginnerBonus computation FAILED: ${err.message}`));
            console.error(err.stack);
        }

        // ── Verify pools after computation ────────────────────────────────────
        console.log(chalk.magenta('\n═══════════════════════════════════════════════════════'));
        console.log(chalk.magenta('  STEP 3: Post-Computation Pool Verification'));
        console.log(chalk.magenta('═══════════════════════════════════════════════════════\n'));

        const tourPoolAfter     = await TourFundPool.findOne({ year: YEAR, month: MONTH }).lean();
        const startupPoolAfter  = await StartUpBonusPool.findOne({ year: YEAR, month: MONTH }).lean();
        const beginnerPoolAfter = await BeginnerBonusPool.findOne({ year: YEAR, month: MONTH }).lean();

        const printPool = (name, pool) => {
            if (!pool) { console.log(`   ${name}: ❌ NO POOL CREATED`); return; }
            console.log(`   ${name}:`);
            console.log(`     Status: ${pool.status}`);
            console.log(`     Pool Amount: ₹${pool.poolAmount?.toFixed(2) || 0}`);
            console.log(`     Total Units: ${pool.totalUnits || 0}`);
            console.log(`     Per Unit Value: ₹${pool.perUnitValue?.toFixed(2) || 0}`);
            console.log(`     Eligible Users: ${pool.eligibleUserCount || 0}`);
        };

        printPool('TourFund', tourPoolAfter);
        printPool('StartUpBonus', startupPoolAfter);
        printPool('BeginnerBonus', beginnerPoolAfter);

        // ── Step 4: Apply Wallet Credits ──────────────────────────────────────
        console.log(chalk.magenta('\n═══════════════════════════════════════════════════════'));
        console.log(chalk.magenta('  STEP 4: Applying Wallet Credits'));
        console.log(chalk.magenta('═══════════════════════════════════════════════════════\n'));

        // 4a. TourFund
        console.log(chalk.yellow('── [4a] TourFund: applyWalletCredits ────────────────'));
        try {
            const { tourFundService } = await import('./src/services/business/tourFund.service.js');
            await tourFundService.applyWalletCredits(YEAR, MONTH);
            console.log(chalk.green('✅ TourFund wallet credits applied.\n'));
        } catch (err) {
            console.error(chalk.red(`❌ TourFund wallet credit FAILED: ${err.message}`));
            console.error(err.stack);
        }

        // 4b. StartUpBonus
        console.log(chalk.yellow('── [4b] StartUpBonus: applyWalletCredits ───────────'));
        try {
            const { startUpBonusService } = await import('./src/services/business/startUpBonus.service.js');
            await startUpBonusService.applyWalletCredits(YEAR, MONTH);
            console.log(chalk.green('✅ StartUpBonus wallet credits applied.\n'));
        } catch (err) {
            console.error(chalk.red(`❌ StartUpBonus wallet credit FAILED: ${err.message}`));
            console.error(err.stack);
        }

        // 4c. BeginnerBonus
        console.log(chalk.yellow('── [4c] BeginnerBonus: applyWalletCredits ──────────'));
        try {
            const { beginnerBonusService } = await import('./src/services/business/beginnerBonus.service.js');
            await beginnerBonusService.applyWalletCredits(YEAR, MONTH);
            console.log(chalk.green('✅ BeginnerBonus wallet credits applied.\n'));
        } catch (err) {
            console.error(chalk.red(`❌ BeginnerBonus wallet credit FAILED: ${err.message}`));
            console.error(err.stack);
        }

        // ── Final Summary ─────────────────────────────────────────────────────
        console.log(chalk.green('\n═══════════════════════════════════════════════════════'));
        console.log(chalk.green('  ✅ RECOVERY COMPLETE'));
        console.log(chalk.green('═══════════════════════════════════════════════════════'));

        // Re-check final states
        const finalTour     = await TourFundPool.findOne({ year: YEAR, month: MONTH }).lean();
        const finalStartup  = await StartUpBonusPool.findOne({ year: YEAR, month: MONTH }).lean();
        const finalBeginner = await BeginnerBonusPool.findOne({ year: YEAR, month: MONTH }).lean();

        console.log(`\n   TourFund:      ${finalTour?.status || 'N/A'} | Users: ${finalTour?.eligibleUserCount || 0} | Pool: ₹${finalTour?.poolAmount?.toFixed(2) || 0}`);
        console.log(`   StartUpBonus:  ${finalStartup?.status || 'N/A'} | Users: ${finalStartup?.eligibleUserCount || 0} | Pool: ₹${finalStartup?.poolAmount?.toFixed(2) || 0}`);
        console.log(`   BeginnerBonus: ${finalBeginner?.status || 'N/A'} | Users: ${finalBeginner?.eligibleUserCount || 0} | Pool: ₹${finalBeginner?.poolAmount?.toFixed(2) || 0}`);
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error(chalk.red('\n❌ FATAL ERROR:'), error);
        process.exit(1);
    }
};

run();
