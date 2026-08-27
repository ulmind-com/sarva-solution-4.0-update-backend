import cron from 'node-cron';
import chalk from 'chalk';
import User from '../../models/User.model.js';
import { mlmService } from './mlm.service.js';
import { cronJobs } from '../../jobs/cron.jobs.js';
import { bonusService } from './bonus.service.js';

/**
 * Initialize all automated tasks
 */
export const initCrons = () => {
    // 1. Monthly Closings (1st of every month at midnight)
    cron.schedule('0 0 1 * *', async () => {
        console.log(chalk.blue('Starting Monthly Reset and Fund Processing...'));
        try {
            const users = await User.find({ status: 'active' });
            for (const user of users) {
                // Reset monthly BV tracking
                user.thisMonthBV = 0;
                if (user.selfPurchase) user.selfPurchase.thisMonthBV = 0;
                await user.save();

                // Check for rank upgrades
                await mlmService.checkRankUpgrade(user._id);
                await bonusService.checkStockPointEligibility(user._id);
            }
            console.log(chalk.green('Monthly processing completed.'));
        } catch (error) {
            console.error(chalk.red('Monthly Processing Error:'), error);
        }
    });

    // 2. Bonus System Automation (Fast Track & Star Matching & Weekly Payouts)
    cronJobs.init();

    console.log(chalk.cyan('Cron jobs initialized successfully.'));
};
