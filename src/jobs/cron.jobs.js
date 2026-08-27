import cron from 'node-cron';
import UserFinance from '../models/UserFinance.model.js';
import chalk from 'chalk';
import moment from 'moment-timezone';
import { getISTDate } from '../utils/date.util.js';
import { masterFranchisePayoutCron } from './masterPayout.jobs.js';

export const cronJobs = {
    /**
     * Initialize all Cron Jobs
     */
    init: () => {
        console.log(chalk.cyan('Initializing Cron Jobs...'));

        // Start Master Payout Cron
        masterFranchisePayoutCron.start();

        // 1. Weekly Payout Processing (Monday 00:00 IST)
        cron.schedule('0 0 * * 1', async () => {
            console.log(chalk.yellow('Running Weekly Payout Aggregation...'));
            await cronJobs.processWeeklyPayout();
        }, {
            timezone: "Asia/Kolkata"
        });

        // 2. Reset Daily Closing Counters (Midnight IST)
        // Reset dailyClosings to 0.
        cron.schedule('0 0 * * *', async () => {
            console.log(chalk.yellow('Running Midnight Counter Reset Job...'));
            await cronJobs.resetDailyCounters();
        }, {
            timezone: "Asia/Kolkata"
        });

        // 3. Monthly Reset (1st Month 00:00)
        cron.schedule('0 0 1 * *', async () => {
            console.log(chalk.yellow('Running Monthly Counter Reset Job...'));
            await cronJobs.resetMonthlyCounters();
        }, { timezone: "Asia/Kolkata" });

        // 4. Yearly Reset (Jan 1st 00:00)
        cron.schedule('0 0 1 1 *', async () => {
            console.log(chalk.yellow('Running Yearly Counter Reset Job...'));
            await cronJobs.resetYearlyCounters();
        }, { timezone: "Asia/Kolkata" });

        // 5. Automatic Payout Generation (Friday 00:00 IST)
        // Runs every Friday at midnight (00:00 IST)
        cron.schedule('0 0 * * 5', async () => {
            console.log(chalk.magenta('Running Automatic Payout Generation...'));
            await cronJobs.processAutomaticPayouts();
        }, { timezone: "Asia/Kolkata" });

        // 6. Binary Closing Cron (Every 4 Hours)
        // Runs at 00:00, 04:00, 08:00, 12:00, 16:00, 20:00
        cron.schedule('0 */4 * * *', async () => {
            console.log(chalk.blue('Running 4-Hour Binary Closing...'));
            await cronJobs.processBinaryClosings();
        }, { timezone: "Asia/Kolkata" });

        // 7. Self Repurchase Bonus Distribution (Last day of month — 23:55 IST)
        // node-cron doesn't natively support "last day of month", so we schedule
        // on days 28–31 and detect the last day at runtime.
        cron.schedule('55 23 28-31 * *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const lastDayOfMonth = now.clone().endOf('month').date();

            // Only execute on the actual last day of the month
            if (now.date() === lastDayOfMonth) {
                console.log(chalk.magenta('Running Self Repurchase Bonus Month-End Distribution...'));
                await cronJobs.processSelfRepurchaseBonus(now.year(), now.month() + 1);
            }
        }, { timezone: 'Asia/Kolkata' });

        // 8. Beginner Bonus: Month-End Unit Computation (Last day of month — 23:45 IST)
        // Runs on days 28–31 and checks at runtime whether it is the actual last day.
        cron.schedule('45 23 28-31 * *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const lastDayOfMonth = now.clone().endOf('month').date();
            if (now.date() === lastDayOfMonth) {
                console.log(chalk.magenta('[BeginnerBonus] Running Month-End Distribution Computation...'));
                try {
                    const { beginnerBonusService } = await import('../services/business/beginnerBonus.service.js');
                    await beginnerBonusService.runMonthEndDistribution(now.year(), now.month() + 1);
                } catch (err) {
                    console.error(chalk.red('[BeginnerBonus] Month-End Computation failed:'), err.message);
                }
            }
        }, { timezone: 'Asia/Kolkata' });

        // 9. Beginner Bonus: Apply Wallet Credits (1st of every month — 00:00 IST)
        // Credits the staged wallet entries created by Job #8 above.
        cron.schedule('0 0 1 * *', async () => {
            const now = moment().tz('Asia/Kolkata');
            // Credit for the PREVIOUS month (since this runs at start of new month)
            const prevMonth = now.clone().subtract(1, 'month');
            console.log(chalk.magenta(`[BeginnerBonus] Applying wallet credits for ${prevMonth.year()}-${prevMonth.month() + 1}...`));
            try {
                const { beginnerBonusService } = await import('../services/business/beginnerBonus.service.js');
                await beginnerBonusService.applyWalletCredits(prevMonth.year(), prevMonth.month() + 1);
            } catch (err) {
                console.error(chalk.red('[BeginnerBonus] Wallet Credit Application failed:'), err.message);
            }
        }, { timezone: 'Asia/Kolkata' });

        // 10. Start Up Bonus: Month-End Unit Computation (Last day of month — 23:40 IST)
        // Runs 5 minutes BEFORE Beginner Bonus (#8) to stagger execution.
        cron.schedule('40 23 28-31 * *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const lastDayOfMonth = now.clone().endOf('month').date();
            if (now.date() === lastDayOfMonth) {
                console.log(chalk.magenta('[StartUpBonus] Running Month-End Distribution Computation...'));
                try {
                    const { startUpBonusService } = await import('../services/business/startUpBonus.service.js');
                    await startUpBonusService.runMonthEndDistribution(now.year(), now.month() + 1);
                } catch (err) {
                    console.error(chalk.red('[StartUpBonus] Month-End Computation failed:'), err.message);
                }
            }
        }, { timezone: 'Asia/Kolkata' });

        // 11. Start Up Bonus: Apply Wallet Credits (1st of every month — 00:05 IST)
        // Runs 5 minutes AFTER Beginner Bonus (#9) to stagger execution.
        cron.schedule('5 0 1 * *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const prevMonth = now.clone().subtract(1, 'month');
            console.log(chalk.magenta(`[StartUpBonus] Applying wallet credits for ${prevMonth.year()}-${prevMonth.month() + 1}...`));
            try {
                const { startUpBonusService } = await import('../services/business/startUpBonus.service.js');
                await startUpBonusService.applyWalletCredits(prevMonth.year(), prevMonth.month() + 1);
            } catch (err) {
                console.error(chalk.red('[StartUpBonus] Wallet Credit Application failed:'), err.message);
            }
        }, { timezone: 'Asia/Kolkata' });

        // 12. Leadership Bonus: Month-End Unit Computation (Last day of month — 23:35 IST)
        // Runs 5 minutes BEFORE Start Up Bonus (#10) to stagger execution.
        cron.schedule('35 23 28-31 * *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const lastDayOfMonth = now.clone().endOf('month').date();
            if (now.date() === lastDayOfMonth) {
                console.log(chalk.magenta('[LeadershipBonus] Running Month-End Distribution Computation...'));
                try {
                    const { leadershipBonusService } = await import('../services/business/leadershipBonus.service.js');
                    await leadershipBonusService.runMonthEndDistribution(now.year(), now.month() + 1);
                } catch (err) {
                    console.error(chalk.red('[LeadershipBonus] Month-End Computation failed:'), err.message);
                }
            }
        }, { timezone: 'Asia/Kolkata' });

        // 13. Leadership Bonus: Apply Wallet Credits (1st of every month — 00:10 IST)
        // Runs 5 minutes AFTER Start Up Bonus (#11) to stagger execution.
        cron.schedule('10 0 1 * *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const prevMonth = now.clone().subtract(1, 'month');
            console.log(chalk.magenta(`[LeadershipBonus] Applying wallet credits for ${prevMonth.year()}-${prevMonth.month() + 1}...`));
            try {
                const { leadershipBonusService } = await import('../services/business/leadershipBonus.service.js');
                await leadershipBonusService.applyWalletCredits(prevMonth.year(), prevMonth.month() + 1);
            } catch (err) {
                console.error(chalk.red('[LeadershipBonus] Wallet Credit Application failed:'), err.message);
            }
        }, { timezone: 'Asia/Kolkata' });

        // 14. Tour Fund: Month-End Unit Computation (Last day of month — 23:30 IST)
        // Runs 5 minutes BEFORE Leadership Bonus (#12) to stagger execution.
        cron.schedule('30 23 28-31 * *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const lastDayOfMonth = now.clone().endOf('month').date();
            if (now.date() === lastDayOfMonth) {
                console.log(chalk.magenta('[TourFund] Running Month-End Distribution Computation...'));
                try {
                    const { tourFundService } = await import('../services/business/tourFund.service.js');
                    await tourFundService.runMonthEndDistribution(now.year(), now.month() + 1);
                } catch (err) {
                    console.error(chalk.red('[TourFund] Month-End Computation failed:'), err.message);
                }
            }
        }, { timezone: 'Asia/Kolkata' });

        // 15. Tour Fund: Apply Wallet Credits (1st of every month — 00:15 IST)
        // Runs 5 minutes AFTER Leadership Bonus (#13) to stagger execution.
        cron.schedule('15 0 1 * *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const prevMonth = now.clone().subtract(1, 'month');
            console.log(chalk.magenta(`[TourFund] Applying wallet credits for ${prevMonth.year()}-${prevMonth.month() + 1}...`));
            try {
                const { tourFundService } = await import('../services/business/tourFund.service.js');
                await tourFundService.applyWalletCredits(prevMonth.year(), prevMonth.month() + 1);
            } catch (err) {
                console.error(chalk.red('[TourFund] Wallet Credit Application failed:'), err.message);
            }
        }, { timezone: 'Asia/Kolkata' });

        // 16. Health & Education Bonus: Month-End Unit Computation (Last day of month — 23:25 IST)
        // Runs 5 minutes BEFORE Tour Fund (#14) to stagger execution.
        cron.schedule('25 23 28-31 * *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const lastDayOfMonth = now.clone().endOf('month').date();
            if (now.date() === lastDayOfMonth) {
                console.log(chalk.magenta('[HealthEducation] Running Month-End Distribution Computation...'));
                try {
                    const { healthEducationBonusService } = await import('../services/business/healthEducationBonus.service.js');
                    await healthEducationBonusService.runMonthEndDistribution(now.year(), now.month() + 1);
                } catch (err) {
                    console.error(chalk.red('[HealthEducation] Month-End Computation failed:'), err.message);
                }
            }
        }, { timezone: 'Asia/Kolkata' });

        // 17. Health & Education Bonus: Apply Wallet Credits (1st of every month — 00:20 IST)
        // Runs 5 minutes AFTER Tour Fund (#15) to stagger execution.
        cron.schedule('20 0 1 * *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const prevMonth = now.clone().subtract(1, 'month');
            console.log(chalk.magenta(`[HealthEducation] Applying wallet credits for ${prevMonth.year()}-${prevMonth.month() + 1}...`));
            try {
                const { healthEducationBonusService } = await import('../services/business/healthEducationBonus.service.js');
                await healthEducationBonusService.applyWalletCredits(prevMonth.year(), prevMonth.month() + 1);
            } catch (err) {
                console.error(chalk.red('[HealthEducation] Wallet Credit Application failed:'), err.message);
            }
        }, { timezone: 'Asia/Kolkata' });

        // 18. Bike & Car Fund: Month-End Unit Computation (Last day of month — 23:20 IST)
        // Runs 5 minutes BEFORE Health & Education (#16) to stagger execution.
        cron.schedule('20 23 28-31 * *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const lastDayOfMonth = now.clone().endOf('month').date();
            if (now.date() === lastDayOfMonth) {
                console.log(chalk.magenta('[BikeCarFund] Running Month-End Distribution Computation...'));
                try {
                    const { bikeCarFundService } = await import('../services/business/bikeCarFund.service.js');
                    await bikeCarFundService.runMonthEndDistribution(now.year(), now.month() + 1);
                } catch (err) {
                    console.error(chalk.red('[BikeCarFund] Month-End Computation failed:'), err.message);
                }
            }
        }, { timezone: 'Asia/Kolkata' });

        // 19. Bike & Car Fund: Apply Wallet Credits (1st of every month — 00:25 IST)
        // Runs 5 minutes AFTER Health & Education (#17) to stagger execution.
        cron.schedule('25 0 1 * *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const prevMonth = now.clone().subtract(1, 'month');
            console.log(chalk.magenta(`[BikeCarFund] Applying wallet credits for ${prevMonth.year()}-${prevMonth.month() + 1}...`));
            try {
                const { bikeCarFundService } = await import('../services/business/bikeCarFund.service.js');
                await bikeCarFundService.applyWalletCredits(prevMonth.year(), prevMonth.month() + 1);
            } catch (err) {
                console.error(chalk.red('[BikeCarFund] Wallet Credit Application failed:'), err.message);
            }
        }, { timezone: 'Asia/Kolkata' });

        // 20. House Fund: Half-Yearly Unit Computation (March 31 and Sept 30 — 23:15 IST)
        cron.schedule('15 23 28-31 3,9 *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const lastDayOfMonth = now.clone().endOf('month').date();
            if (now.date() === lastDayOfMonth) {
                console.log(chalk.magenta('[HouseFund] Running Half-Yearly Distribution Computation...'));
                try {
                    const { houseFundService } = await import('../services/business/houseFund.service.js');
                    const { cycleYear, cycleNumber } = houseFundService.getCurrentCycle();
                    await houseFundService.runCycleEndDistribution(cycleYear, cycleNumber);
                } catch (err) {
                    console.error(chalk.red('[HouseFund] Half-Yearly Computation failed:'), err.message);
                }
            }
        }, { timezone: 'Asia/Kolkata' });

        // 21. House Fund: Apply Wallet Credits (April 1 and Oct 1 — 00:30 IST)
        // Runs 1st of 4th month (April) and 10th month (October)
        cron.schedule('30 0 1 4,10 *', async () => {
            const now = moment().tz('Asia/Kolkata');
            console.log(chalk.magenta(`[HouseFund] Applying half-yearly wallet credits...`));
            try {
                const { houseFundService } = await import('../services/business/houseFund.service.js');
                const prevDate = now.clone().subtract(1, 'day');
                const m = prevDate.month() + 1;
                const y = prevDate.year();
                let cY = y;
                let cN = 1;
                if (m >= 4 && m <= 9) { cY = y; cN = 1; }
                else if (m >= 10 && m <= 12) { cY = y; cN = 2; }
                else { cY = y - 1; cN = 2; }

                await houseFundService.applyWalletCredits(cY, cN);
            } catch (err) {
                console.error(chalk.red('[HouseFund] Wallet Credit Application failed:'), err.message);
            }
        }, { timezone: 'Asia/Kolkata' });

        // 22. Royalty Fund: Yearly Unit Computation (March 31 — 23:10 IST)
        cron.schedule('10 23 28-31 3 *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const lastDayOfMonth = now.clone().endOf('month').date();
            if (now.date() === lastDayOfMonth) {
                console.log(chalk.magenta('[RoyaltyFund] Running Yearly Distribution Computation...'));
                try {
                    const { royaltyFundService } = await import('../services/business/royaltyFund.service.js');
                    const cycleYear = royaltyFundService.getCurrentCycleYear();
                    await royaltyFundService.runCycleEndDistribution(cycleYear);
                } catch (err) {
                    console.error(chalk.red('[RoyaltyFund] Yearly Computation failed:'), err.message);
                }
            }
        }, { timezone: 'Asia/Kolkata' });

        // 23. Royalty Fund: Apply Wallet Credits (April 1 — 00:35 IST)
        cron.schedule('35 0 1 4 *', async () => {
            const now = moment().tz('Asia/Kolkata');
            console.log(chalk.magenta(`[RoyaltyFund] Applying yearly wallet credits...`));
            try {
                const { royaltyFundService } = await import('../services/business/royaltyFund.service.js');
                const prevDate = now.clone().subtract(1, 'day');
                const m = prevDate.month() + 1;
                const y = prevDate.year();
                const cycleYear = (m >= 4 && m <= 12) ? y + 1 : y;

                await royaltyFundService.applyWalletCredits(cycleYear);
            } catch (err) {
                console.error(chalk.red('[RoyaltyFund] Wallet Credit Application failed:'), err.message);
            }
        }, { timezone: 'Asia/Kolkata' });

        // 24. SSVPL Super Bonus: Yearly Unit Computation (March 31 — 23:05 IST)
        cron.schedule('5 23 28-31 3 *', async () => {
            const now = moment().tz('Asia/Kolkata');
            const lastDayOfMonth = now.clone().endOf('month').date();
            if (now.date() === lastDayOfMonth) {
                console.log(chalk.magenta('[SsvplSuperBonus] Running Yearly Distribution Computation...'));
                try {
                    const { ssvplSuperBonusService } = await import('../services/business/ssvplSuperBonus.service.js');
                    const cycleYear = ssvplSuperBonusService.getCurrentCycleYear();
                    await ssvplSuperBonusService.runCycleEndDistribution(cycleYear);
                } catch (err) {
                    console.error(chalk.red('[SsvplSuperBonus] Yearly Computation failed:'), err.message);
                }
            }
        }, { timezone: 'Asia/Kolkata' });

        // 25. SSVPL Super Bonus: Apply Wallet Credits (April 1 — 00:40 IST)
        cron.schedule('40 0 1 4 *', async () => {
            const now = moment().tz('Asia/Kolkata');
            console.log(chalk.magenta(`[SsvplSuperBonus] Applying yearly wallet credits...`));
            try {
                const { ssvplSuperBonusService } = await import('../services/business/ssvplSuperBonus.service.js');
                const prevDate = now.clone().subtract(1, 'day');
                const m = prevDate.month() + 1;
                const y = prevDate.year();
                const cycleYear = (m >= 4 && m <= 12) ? y + 1 : y;

                await ssvplSuperBonusService.applyWalletCredits(cycleYear);
            } catch (err) {
                console.error(chalk.red('[SsvplSuperBonus] Wallet Credit Application failed:'), err.message);
            }
        }, { timezone: 'Asia/Kolkata' });

        // 26. Franchise Repurchase Payout: Month-End Generation (1st day of new month — 00:10 IST)
        cron.schedule('10 0 1 * *', async () => {
            const now = moment().tz('Asia/Kolkata');
            console.log(chalk.magenta('[FranchisePayout] Running Month-End Repurchase BV Generation for previous month...'));
            try {
                const { franchisePayoutService } = await import('../services/business/franchisePayout.service.js');
                await franchisePayoutService.generateMonthlyPayouts(now.toDate());
            } catch (err) {
                console.error(chalk.red('[FranchisePayout] Month-End Generation failed:'), err.message);
            }
        }, { timezone: 'Asia/Kolkata' });

        console.log(chalk.green('Cron Jobs Scheduled.'));
    },

    /**
     * Logic: 4-Hour Binary Closing Sweep
     */
    processBinaryClosings: async () => {
        try {
            // Find ALL active users? Or those with pending volume?
            // To ensure 6 closings, we should check everyone who might have volume.
            // Optimized: Find users with pendingPair > 0 OR pendingStars > 0.

            const users = await UserFinance.find({
                $or: [
                    { "fastTrack.pendingPairLeft": { $gt: 0 } },
                    { "fastTrack.pendingPairRight": { $gt: 0 } },
                    { "starMatchingBonus.pendingStarsLeft": { $gt: 0 } },
                    { "starMatchingBonus.pendingStarsRight": { $gt: 0 } }
                ]
            });

            console.log(`Processing Binary Closing for ${users.length} users.`);

            const { matchingService } = await import('../services/business/matching.service.js');

            for (const finance of users) {
                // Trigger Matching Service
                // It has internal safeguards for Time Gap, but since this IS the cron, 
                // the Time Gap check in service might block it if 4h exact?
                // I modified service to use `fourHoursMs - 60000` (buffer), so it should pass.

                await matchingService.processFastTrackMatching(finance.user);

                if (finance.isStar) {
                    await matchingService.processStarMatching(finance.user);
                }
            }
        } catch (e) {
            console.error('Binary Closing Error:', e);
        }
    },

    /**
     * Logic: Weekly Payout Aggregation
     * Aggregates weekly earnings from FastTack and StarMatching and adds to Available Balance.
     * (Although current matching service ADDS to available balance immediately. 
     *  Review: If user wants "Weekly Payout", we should likely HOLD it in a "Weekly Buffer" first?
     *  The Images said "Weekly Payout". 
     *  But my `matching.service` currently credits `availableBalance` instantly.
     *  Refinement: I will keep immediate credit for satisfaction, but IF stricter weekly payout is needed,
     *  we would buffer it. The user prompt asked for "Weekly Payout Aggregation Missing... const weeklyTotal...".
     *  So I will IMPLEMENT the buffer logic.)
     * 
     *  CORRECTION: matching.service credits `availableBalance` directly currently.
     *  I should CHANGE matching.service to credit `weeklyEarnings` INSTEAD of `availableBalance`.
     *  And THIS job moves it to `availableBalance`.
     */
    processWeeklyPayout: async () => {
        try {
            const users = await UserFinance.find({
                $or: [
                    { "fastTrack.weeklyEarnings": { $gt: 0 } },
                    { "starMatchingBonus.weeklyEarnings": { $gt: 0 } }
                ]
            });

            console.log(chalk.blue(`Processing Weekly Payout for ${users.length} users...`));

            for (const finance of users) {
                const totalWeekly = (finance.fastTrack.weeklyEarnings || 0) + (finance.starMatchingBonus.weeklyEarnings || 0);

                if (totalWeekly > 0) {
                    // finance.wallet.availableBalance += totalWeekly; // Disabled: Moved to Instant Credit in Matching Service
                    // finance.wallet.totalEarnings += totalWeekly; // Already tracked instantly

                    // Stats Reset Only

                    // Reset Weekly Trackers
                    finance.fastTrack.weeklyEarnings = 0;
                    finance.starMatchingBonus.weeklyEarnings = 0;
                    await finance.save();
                }
            }
            console.log(chalk.green('Weekly Payout Completed.'));
        } catch (e) {
            console.error('Weekly Payout Error:', e);
        }
    },

    /**
     * Logic: Reset Daily Counters
     */
    async resetDailyCounters() {
        try {
            await UserFinance.updateMany({}, {
                $set: {
                    "fastTrack.dailyClosings": 0,
                    "starMatchingBonus.dailyClosings": 0
                }
            });
            console.log('Daily counters reset successfully.');
        } catch (e) {
            console.error('Reset Job Error:', e);
        }
    },

    /**
     * Logic: Monthly Reset (1st of Month)
     */
    async resetMonthlyCounters() {
        try {
            await UserFinance.updateMany({}, {
                $set: {
                    thisMonthBV: 0,
                    thisMonthPV: 0,
                    "selfPurchase.thisMonthBV": 0
                }
            });
            console.log('Monthly counters reset successfully.');
        } catch (e) {
            console.error('Monthly Reset Error:', e);
        }
    },

    /**
     * Logic: Yearly Reset (Jan 1st)
     */
    async resetYearlyCounters() {
        try {
            await UserFinance.updateMany({}, {
                $set: {
                    thisYearBV: 0,
                    thisYearPV: 0
                }
            });
            console.log('Yearly counters reset successfully.');
        } catch (e) {
            console.error('Yearly Reset Error:', e);
        }
    },

    /**
     * Logic: Automatic Payout Generation (Friday 00:00 IST)
     * Iterates all users, checks balance >= minWithdrawal, checks KYC verification,
     * Creates Payout Request.
     */
    async processAutomaticPayouts() {
        console.log(chalk.blue('Processing Automatic Payout Requests...'));

        // Statistics tracking
        const stats = {
            totalScanned: 0,
            skippedLowBalance: 0,
            skippedNoKYC: 0,
            successfulPayouts: 0,
            totalAmountGenerated: 0,
            errors: []
        };

        try {
            // Find users with balance >= 300 (optimization)
            const finances = await UserFinance.find({
                "wallet.availableBalance": { $gte: 300 }
            }).populate('user');

            stats.totalScanned = finances.length;
            console.log(chalk.cyan(`Found ${finances.length} users with balance >= 300`));

            for (const finance of finances) {
                if (!finance.user) continue;

                const user = finance.user;
                const balance = finance.wallet.availableBalance;

                // User Request: Minimum >= 300 (300 or more qualifies)
                const minWithdrawal = 300;

                // User Request: No KYC Check for Automatic Payout
                // if (!user.kyc || user.kyc.status !== 'verified') { ... } // SKIPPED

                // Balance Check — include exactly 300 (skip only if strictly below)
                if (balance < minWithdrawal) {
                    stats.skippedLowBalance++;
                    continue;
                }

                // Process payout
                try {
                    const requestedAmount = balance; // Withdraw EVERYTHING available

                    // User Request: No Admin Charge, No TDS
                    const adminCharge = 0;
                    const tdsAmount = 0;
                    const netAmount = requestedAmount; // Full amount

                    const payout = await import('../models/Payout.model.js').then(m => m.default.create({
                        userId: user._id,
                        memberId: user.memberId,
                        payoutType: 'withdrawal',
                        grossAmount: requestedAmount,
                        adminCharge,
                        tdsDeducted: tdsAmount,
                        netAmount,
                        status: 'pending',
                        scheduledFor: getISTDate()
                    }));

                    // Update Wallet
                    finance.wallet.availableBalance -= requestedAmount;
                    finance.wallet.pendingWithdrawal += netAmount;
                    finance.wallet.withdrawnAmount += requestedAmount;

                    await finance.save();

                    stats.successfulPayouts++;
                    stats.totalAmountGenerated += requestedAmount;
                    console.log(chalk.green(`✓ Payout created for ${user.memberId}: ₹${requestedAmount.toFixed(2)} (Net: ₹${netAmount.toFixed(2)})`));
                } catch (err) {
                    stats.errors.push({ memberId: user.memberId, error: err.message });
                    console.error(chalk.red(`✗ Failed payout for ${user.memberId}:`), err.message);
                }
            }

            // Final Summary
            console.log(chalk.magenta('\n========== PAYOUT GENERATION SUMMARY =========='));
            console.log(chalk.cyan(`Total Users Scanned: ${stats.totalScanned}`));
            console.log(chalk.yellow(`Skipped (Low Balance): ${stats.skippedLowBalance}`));
            console.log(chalk.yellow(`Skipped (No KYC): ${stats.skippedNoKYC}`));
            console.log(chalk.green(`Successful Payouts: ${stats.successfulPayouts}`));
            console.log(chalk.green(`Total Amount Generated: ₹${stats.totalAmountGenerated.toFixed(2)}`));
            if (stats.errors.length > 0) {
                console.log(chalk.red(`Errors: ${stats.errors.length}`));
                stats.errors.forEach(e => console.log(chalk.red(`  - ${e.memberId}: ${e.error}`)));
            }
            console.log(chalk.magenta('===============================================\n'));

        } catch (e) {
            console.error(chalk.red('Automatic Payout Error:'), e);
        }
    },

    /**
     * Logic: Self Repurchase Bonus Month-End Distribution
     * Delegates to the SRB service. Idempotent — safe to call multiple times.
     */
    async processSelfRepurchaseBonus(year, month) {
        try {
            const { selfRepurchaseService } = await import('../services/business/selfRepurchase.service.js');
            const result = await selfRepurchaseService.runMonthEndDistribution(year, month);
            console.log(chalk.green(`[SRB] Distribution complete — status: ${result.status} | credits: ${result.creditsIssued}`));
        } catch (e) {
            console.error(chalk.red('[SRB] Month-End Distribution Error:'), e);
        }
    }
};
