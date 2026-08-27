import cron from 'node-cron';
import chalk from 'chalk';
import { generateDifferentialMasterPayouts } from '../services/business/masterPayout.service.js';
import { franchisePayoutService } from '../services/business/franchisePayout.service.js';

/**
 * Job: Comprehensive Franchise Payout Engine (Normal & Master)
 * Schedule: 01:20 AM on the 1st of every month
 * Description: Generates the 10% standard payouts, isolates masters, zeros out PV/BV, 
 * and immediately triggers the 15% isolated master differentials.
 */
export const masterFranchisePayoutCron = cron.schedule('30 1 1 * *', async () => {
    console.log('--------------------------------------------------');
    console.log(chalk.yellow('⚙️ [CRON JOB TRIGGERED: End-of-Month Franchise Ledger]'));
    console.log(`⏱️ Trigger Time: ${new Date().toISOString()}`);
    console.log('--------------------------------------------------');
    
    try {
        console.log(chalk.cyan('Step 1: Generating standard Franchise BV/PV Payouts and zeroing counters...'));
        await franchisePayoutService.generateMonthlyPayouts();

        console.log(chalk.cyan('Step 2: Generating Isolated Master Differentials & Overrides...'));
        await generateDifferentialMasterPayouts();
        
        console.log(chalk.green('✅ [CRON JOB COMPLETED: All Franchise Payouts Successfully Settled]'));
    } catch (error) {
        console.error(chalk.red('❌ [CRON JOB FAILED: Franchise Ledger]'), error);
    }
}, {
    timezone: "Asia/Kolkata",
    scheduled: true
});
