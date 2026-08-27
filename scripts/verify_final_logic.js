import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import { matchingService } from '../src/services/matching.service.js';
import { cronJobs } from '../src/jobs/cron.jobs.js';
import chalk from 'chalk';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const runSimulation = async () => {
    await connectDB();
    console.log(chalk.blue('Starting Final System Verification Simulation...'));

    try {
        // 1. Setup Test User
        const memberId = 'SIM_USER_' + Date.now();
        const user = await User.create({
            memberId,
            email: `sim_${Date.now()}@test.com`,
            password: 'pass',
            fullName: 'Simulation User',
            phone: Math.floor(Math.random() * 10000000000).toString(),
            status: 'active'
        });
        const finance = await UserFinance.create({ user: user._id, memberId });

        // Initialize
        finance.fastTrack = { dailyClosings: 0, pendingPairLeft: 0, pendingPairRight: 0, carryForwardLeft: 0, carryForwardRight: 0, closingHistory: [], weeklyEarnings: 0 };
        await finance.save();

        console.log(chalk.cyan('--- Scenario 1: First Match (2:1) ---'));
        // Add PV
        finance.fastTrack.pendingPairLeft = 1000;
        finance.fastTrack.pendingPairRight = 500;
        await finance.save();

        await matchingService.processFastTrackMatching(user._id);

        let f = await UserFinance.findOne({ user: user._id });
        if (f.fastTrack.dailyClosings === 1 && f.fastTrack.weeklyEarnings > 0) {
            console.log(chalk.green('✅ First Match Successful. Earnings Buffered.'));
        } else {
            console.log(chalk.red('❌ First Match Failed.'));
        }

        console.log(chalk.cyan('--- Scenario 2: 4-Hour Gap Block ---'));
        // Add new PV immediately
        f.fastTrack.pendingPairLeft = 500;
        f.fastTrack.pendingPairRight = 500;
        await f.save();

        await matchingService.processFastTrackMatching(user._id);

        f = await UserFinance.findOne({ user: user._id });
        if (f.fastTrack.dailyClosings === 1 && f.fastTrack.pendingPairLeft === 500) {
            console.log(chalk.green('✅ Match Blocked by 4-Hour Gate. PV preserved in Pending.'));
        } else {
            console.log(chalk.red(`❌ Match Should be Blocked. Closings: ${f.fastTrack.dailyClosings}`));
        }

        console.log(chalk.cyan('--- Scenario 3: Time Jump + Carry Forward ---'));
        // Artificial Time Travel: Set lastClosingTime to 5 hours ago
        const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
        f.fastTrack.lastClosingTime = fiveHoursAgo;
        await f.save();

        await matchingService.processFastTrackMatching(user._id);

        f = await UserFinance.findOne({ user: user._id });
        if (f.fastTrack.dailyClosings === 2 && f.fastTrack.pendingPairLeft === 0) {
            console.log(chalk.green('✅ Match Processed after 4 hours.'));
        } else {
            console.log(chalk.red(`❌ Match Failed after Time Jump. Closings: ${f.fastTrack.dailyClosings}`));
        }

        console.log(chalk.cyan('--- Scenario 4: Daily Limit Hit ---'));
        f.fastTrack.dailyClosings = 6;
        f.fastTrack.pendingPairLeft = 500;
        f.fastTrack.pendingPairRight = 500;
        // Ensure time gap is valid
        f.fastTrack.lastClosingTime = fiveHoursAgo;
        await f.save();

        await matchingService.processFastTrackMatching(user._id);

        f = await UserFinance.findOne({ user: user._id });
        if (f.fastTrack.dailyClosings === 6 && f.fastTrack.pendingPairLeft === 500) {
            console.log(chalk.green('✅ Match Blocked by Daily Limit. PV preserved.'));
        } else {
            console.log(chalk.red('❌ Daily Limit Failed.'));
        }

        console.log(chalk.cyan('--- Scenario 5: Weekly Payout Execution ---'));
        const preBalance = f.wallet.availableBalance;
        const buffered = f.fastTrack.weeklyEarnings;

        await cronJobs.processWeeklyPayout();

        f = await UserFinance.findOne({ user: user._id });
        if (f.wallet.availableBalance === preBalance + buffered && f.fastTrack.weeklyEarnings === 0) {
            console.log(chalk.green(`✅ Weekly Payout Success. Wallet: ${f.wallet.availableBalance}`));
        } else {
            console.log(chalk.red('❌ Weekly Payout Failed.'));
        }

    } catch (e) {
        console.error(chalk.red('Simulation Error:'), e);
    }
    process.exit(0);
};

runSimulation();
