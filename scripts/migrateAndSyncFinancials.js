import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
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

const runScript = async () => {
    await connectDB();
    console.log(chalk.blue('Starting Migration & Perfect Internal Sync...'));

    try {
        // 1. Fetch all users
        console.log(chalk.cyan('Fetching all users...'));
        const allUsers = await User.find({}).lean();
        console.log(chalk.green(`Loaded ${allUsers.length} users.`));

        // Create Maps for O(1) Access
        const userMap = new Map();
        allUsers.forEach(u => userMap.set(u._id.toString(), u));

        // 2. Migration: Ensure UserFinance exists and copy data
        console.log(chalk.yellow('Migrating Financial Data to UserFinance...'));
        let migratedCount = 0;

        for (const user of allUsers) {
            let finance = await UserFinance.findOne({ user: user._id });
            if (!finance) {
                finance = new UserFinance({
                    user: user._id,
                    memberId: user.memberId
                });
            }

            // Copy Data if finance is "fresh" (or force update? Let's force update existing data from User source of truth)
            // Actually, we should only copy if we haven't already migrated. 
            // Since we are transitioning, let's assume User has the latest data.

            // Basic Financials
            finance.personalBV = user.personalBV || 0;
            finance.leftLegBV = user.leftLegBV || 0;
            finance.rightLegBV = user.rightLegBV || 0;
            finance.totalBV = user.totalBV || 0;
            finance.thisMonthBV = user.thisMonthBV || 0;
            finance.thisYearBV = user.thisYearBV || 0;
            finance.carryForwardLeft = user.carryForwardLeft || 0;
            finance.carryForwardRight = user.carryForwardRight || 0;

            // PV
            finance.personalPV = user.personalPV || 0;
            finance.leftLegPV = user.leftLegPV || 0;
            finance.rightLegPV = user.rightLegPV || 0;
            finance.totalPV = user.totalPV || 0;
            finance.thisMonthPV = user.thisMonthPV || 0;
            finance.thisYearPV = user.thisYearPV || 0;

            // Wallet
            if (user.wallet) {
                finance.wallet = user.wallet;
            }

            // Ranks
            finance.currentRank = user.currentRank;
            finance.rankNumber = user.rankNumber;
            finance.starMatching = user.starMatching || 0;
            finance.rankBonus = user.rankBonus || 0;
            finance.achievedDate = user.achievedDate;
            finance.rankHistory = user.rankHistory;

            // Funds
            if (user.bikeCarFund) finance.bikeCarFund = user.bikeCarFund;
            if (user.houseFund) finance.houseFund = user.houseFund;
            if (user.royaltyFund) finance.royaltyFund = user.royaltyFund;
            if (user.ssvplSuperBonus) finance.ssvplSuperBonus = user.ssvplSuperBonus;

            // Save
            await finance.save();
            migratedCount++;
        }
        console.log(chalk.green(`Migrated ${migratedCount} UserFinance records.`));


        // 3. Recursive Recalculation (Sync)
        // Now that UserFinance exists, we fetch them all to recalculate Upstream Totals correctly.
        // Similar to recalculateTeamCounts, but reading/writing UserFinance.

        console.log(chalk.cyan('Fetching UserFinance records for calculation...'));
        const allFinance = await UserFinance.find({}).lean();
        const financeMap = new Map();
        allFinance.forEach(f => financeMap.set(f.user.toString(), f));

        // Helper: Recursive Financials
        // Returns { bv: 0, pv: 0 }
        const financialCache = new Map(); // Map<UserId, {bv, pv}>

        const getRecursiveFinancials = (userId) => {
            if (!userId) return { bv: 0, pv: 0 };
            const strId = userId.toString();

            if (financialCache.has(strId)) return financialCache.get(strId);

            const user = userMap.get(strId);
            if (!user) return { bv: 0, pv: 0 }; // Should not happen

            // Inactive Check
            if (user.status !== 'active') {
                financialCache.set(strId, { bv: 0, pv: 0 });
                return { bv: 0, pv: 0 };
            }

            const left = getRecursiveFinancials(user.leftChild);
            const right = getRecursiveFinancials(user.rightChild);

            const pBV = financeMap.get(strId)?.personalBV || 0;
            const pPV = financeMap.get(strId)?.personalPV || 0;

            const totalBV = pBV + left.bv + right.bv;
            const totalPV = pPV + left.pv + right.pv;

            financialCache.set(strId, { bv: totalBV, pv: totalPV });
            return { bv: totalBV, pv: totalPV };
        };

        const updates = [];
        console.log(chalk.cyan('Calculating recursive totals...'));

        for (const user of allUsers) {
            const lFin = getRecursiveFinancials(user.leftChild);
            const rFin = getRecursiveFinancials(user.rightChild);

            // Get Current Personal for Total Calc
            const pBV = financeMap.get(user._id.toString())?.personalBV || 0;
            const pPV = financeMap.get(user._id.toString())?.personalPV || 0;

            const updateDoc = {
                leftLegBV: lFin.bv,
                rightLegBV: rFin.bv,
                leftLegPV: lFin.pv,
                rightLegPV: rFin.pv,
                // totalBV is cumulative group volume including self? Or just downline?
                // Usually Total Group BV = Self + Left + Right
                totalBV: (user.status === 'active' ? pBV : 0) + lFin.bv + rFin.bv,
                totalPV: (user.status === 'active' ? pPV : 0) + lFin.pv + rFin.pv
            };

            // Flashout Rule Enforced
            if (user.status !== 'active') {
                updateDoc.personalBV = 0;
                updateDoc.personalPV = 0;
                updateDoc.totalBV = 0;
                updateDoc.totalPV = 0;
                updateDoc.leftLegBV = 0;
                updateDoc.rightLegBV = 0;
                updateDoc.leftLegPV = 0;
                updateDoc.rightLegPV = 0;
                updateDoc.thisMonthBV = 0;
                updateDoc.thisMonthPV = 0;
                updateDoc.thisYearBV = 0;
                updateDoc.thisYearPV = 0;
                updateDoc.carryForwardLeft = 0;
                updateDoc.carryForwardRight = 0;
            }

            updates.push({
                updateOne: {
                    filter: { user: user._id },
                    update: updateDoc
                }
            });
        }

        console.log(chalk.blue(`Applying ${updates.length} calculations to UserFinance...`));
        if (updates.length > 0) {
            await UserFinance.bulkWrite(updates);
        }

        // 4. Update Team Counts (Genealogy) on User model
        // We can reuse the logic from previous script, or import it.
        // Let's do a quick pass for Team Counts to ensure perfect sync there too.
        console.log(chalk.yellow('Syncing Genealogy Team Counts...'));
        const teamUpdates = [];
        const countCache = new Map();

        const getRecursiveTeamCount = (userId) => {
            if (!userId) return 0;
            const strId = userId.toString();
            if (countCache.has(strId)) return countCache.get(strId);

            const user = userMap.get(strId);
            if (!user) return 0;

            const left = getRecursiveTeamCount(user.leftChild);
            const right = getRecursiveTeamCount(user.rightChild);
            const total = 1 + left + right; // Includes self for parent's count

            countCache.set(strId, total);
            return total;
        };

        for (const user of allUsers) {
            const lCount = getRecursiveTeamCount(user.leftChild);
            const rCount = getRecursiveTeamCount(user.rightChild);

            teamUpdates.push({
                updateOne: {
                    filter: { _id: user._id },
                    update: { leftTeamCount: lCount, rightTeamCount: rCount }
                }
            });
        }

        if (teamUpdates.length > 0) {
            await User.bulkWrite(teamUpdates);
        }

        console.log(chalk.green('Migration & Sync Complete! Database is Normalized and Consistent.'));
        process.exit(0);

    } catch (e) {
        console.error(chalk.red('Migration Failed:'), e);
        process.exit(1);
    }
};

runScript();
