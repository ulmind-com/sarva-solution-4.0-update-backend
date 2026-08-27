import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import Payout from '../src/models/Payout.model.js';
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

const testDeductions = async () => {
    await connectDB();
    console.log(chalk.blue('Starting Financial Logic Verification (TDS Check)...'));

    try {
        // 1. Create or Find a User
        let user = await User.findOne({ email: 'test_deduction@example.com' });
        if (!user) {
            console.log("Creating test user...");
            user = await User.create({
                memberId: 'TEST_' + Date.now(),
                email: 'test_deduction@example.com',
                password: 'password123',
                fullName: 'Test Deduction User',
                phone: '9999999999',
                sponsorId: 'ADMIN', // assuming ADMIN exists or validation skipped for test
                panCardNumber: 'ABCDE1234F',
                role: 'user',
                status: 'active'
            });
            await UserFinance.create({ user: user._id, memberId: user.memberId });
        }

        console.log(`Testing with User: ${user.memberId}`);

        // 2. Mock Finance Data
        let finance = await UserFinance.findOne({ user: user._id });
        if (!finance) {
            finance = await UserFinance.create({ user: user._id, memberId: user.memberId });
        }

        // Initialize structures if missing
        if (!finance.fastTrack) finance.fastTrack = { dailyClosings: 0, pendingPairLeft: 0, pendingPairRight: 0, carryForwardLeft: 0, carryForwardRight: 0, closingHistory: [] };

        // Reset buffers for testing
        finance.fastTrack.pendingPairLeft = 2000;
        finance.fastTrack.pendingPairRight = 2000;
        finance.fastTrack.dailyClosings = 0;
        finance.fastTrack.closingHistory = []; // Reset history so it's a first match
        // clear last closing time to ensure 4hr gap doesn't block
        finance.fastTrack.lastClosingTime = null;

        await finance.save();

        // 3. Trigger Fast Track Match
        console.log(chalk.cyan('Triggering Fast Track Match...'));
        await matchingService.processFastTrackMatching(user._id);

        // 4. Check Payout Record
        const latestPayout = await Payout.findOne({
            userId: user._id,
            payoutType: 'fast-track-bonus'
        }).sort({ createdAt: -1 });

        if (latestPayout) {
            console.log(chalk.yellow('Payout Generated:'));
            console.log(`Gross: ${latestPayout.grossAmount}`);
            console.log(`Admin (5%): ${latestPayout.adminCharge}`);
            console.log(`TDS (2%): ${latestPayout.tdsDeducted}`);
            console.log(`Net: ${latestPayout.netAmount}`);

            // Verification
            const expectedAdmin = latestPayout.grossAmount * 0.05;
            const expectedTDS = latestPayout.grossAmount * 0.02;
            const expectedNet = latestPayout.grossAmount - expectedAdmin - expectedTDS;

            // Tolerance matching
            if (Math.abs(latestPayout.netAmount - expectedNet) < 0.1 && expectedTDS > 0) {
                console.log(chalk.green('✅ Deduction Logic Verified: 5% Admin + 2% TDS Correct.'));
            } else {
                console.log(chalk.red('❌ Deduction Logic INCORRECT.'));
                console.log(`Expected Net: ${expectedNet}, Got: ${latestPayout.netAmount}`);
            }
        } else {
            console.log(chalk.red('No Payout Generated. Check matching logic constraints.'));
        }

    } catch (e) {
        console.error(chalk.red('Test Failed:'), e);
    }
    process.exit(0);
};

testDeductions();
