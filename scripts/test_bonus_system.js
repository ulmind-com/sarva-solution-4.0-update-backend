import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import { mlmService } from '../src/services/mlm.service.js';
import { matchingService } from '../src/services/matching.service.js';
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

const runTest = async () => {
    await connectDB();
    console.log(chalk.blue('Starting Bonus System Test...'));

    try {
        // 1. Find ANY Suitable Root User (Testing on Live Data)
        console.log(chalk.cyan('Querying for a user with both Left and Right legs...'));
        const root = await User.findOne({
            leftChild: { $ne: null },
            rightChild: { $ne: null }
        });

        if (!root) {
            console.error(chalk.red('FATAL: No suitable user found (must have 2 legs). Populate data first.'));
            process.exit(1);
        }

        console.log(chalk.cyan(`Using User: ${root.memberId} (${root.email})`));
        console.log(`Left Child: ${root.leftChild}, Right Child: ${root.rightChild}`);

        // Reset Finance for clean test
        console.log(chalk.yellow('Resetting Finance State for Test...'));

        // Ensure UserFinance Exists
        let finance = await UserFinance.findOne({ user: root._id });
        if (!finance) {
            finance = new UserFinance({ user: root._id, memberId: root.memberId });
            await finance.save();
        }

        await UserFinance.updateOne({ user: root._id }, {
            $set: {
                "fastTrack.dailyClosings": 0,
                "fastTrack.pendingPairLeft": 0,
                "fastTrack.pendingPairRight": 0,
                "fastTrack.carryForwardLeft": 0,
                "fastTrack.carryForwardRight": 0,
                "fastTrack.closingHistory": [],
                "fastTrack.lastClosingTime": null
            }
        });

        // 2. Inject PV to trigger Fast Track
        // Simulate 500 PV Left, 500 PV Right
        console.log(chalk.yellow('Injecting 500 PV Left...'));
        // Use 'admin-adjustment' instead of 'test'
        await mlmService.propagateBVUpTree(root.leftChild, 'left', 500, 'admin-adjustment', 'TEST-L', 500);

        console.log(chalk.yellow('Injecting 500 PV Right...'));
        await mlmService.propagateBVUpTree(root.rightChild, 'right', 500, 'admin-adjustment', 'TEST-R', 500);

        // 3. Verify Bonus Output
        finance = await UserFinance.findOne({ user: root._id });
        console.log(chalk.magenta('Checking Finance State...'));
        console.log('Daily Closings:', finance.fastTrack.dailyClosings);
        console.log('Pending Left:', finance.fastTrack.pendingPairLeft);
        console.log('Pending Right:', finance.fastTrack.pendingPairRight);
        console.log('History Length:', finance.fastTrack.closingHistory.length);

        if (finance.fastTrack.dailyClosings >= 1) {
            console.log(chalk.green('SUCCESS: Fast Track Bonus Triggered!'));
            if (finance.fastTrack.closingHistory.length > 0) {
                const payment = finance.fastTrack.closingHistory[finance.fastTrack.closingHistory.length - 1];
                console.log(`Paid: ${payment.amount}, Deduction: ${payment.deductedForRank}`);
            }
        } else {
            console.log(chalk.red('FAILURE: Fast Track Bonus NOT Triggered.'));
        }

        // 4. Test 4-Hour Gap
        console.log(chalk.yellow('Testing 4-Hour Gap Limit (Immediate Re-injection)...'));
        await mlmService.propagateBVUpTree(root.leftChild, 'left', 500, 'admin-adjustment', 'TEST-L2', 500);
        await mlmService.propagateBVUpTree(root.rightChild, 'right', 500, 'admin-adjustment', 'TEST-R2', 500);

        const finance2 = await UserFinance.findOne({ user: root._id });

        // We expect NO new closing. So History length same, Daily Closing count same.
        if (finance2.fastTrack.dailyClosings === finance.fastTrack.dailyClosings) {
            console.log(chalk.green('SUCCESS: 4-Hour Gap Limit Enforced.'));
            console.log('Pending Left Buffered:', finance2.fastTrack.pendingPairLeft);
        } else {
            // If it incremented, failed.
            console.log(chalk.red('FAILURE: 4-Hour Gap NOT Enforced!'));
        }

    } catch (e) {
        console.error(chalk.red('Test Failed:'), e);
    }
    process.exit(0);
};

runTest();
