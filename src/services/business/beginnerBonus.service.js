import mongoose from 'mongoose';
import moment from 'moment-timezone';
import chalk from 'chalk';

import BeginnerBonusState from '../../models/BeginnerBonusState.model.js';
import BeginnerBonusPool from '../../models/BeginnerBonusPool.model.js';
import BeginnerBonusWalletCredit from '../../models/BeginnerBonusWalletCredit.model.js';
import UserFinance from '../../models/UserFinance.model.js';
import { savingsWalletService } from './savingsWallet.service.js';
import { tdsLedgerService } from './tdsLedger.service.js';
import { getTreeLookup, getDescendantIds, sumRepurchaseBV, invalidateTreeCache } from './_treeHelper.js';

const TIMEZONE = 'Asia/Kolkata';
const POOL_PERCENT = 0.18;        // 18% of company BV
const BV_PER_UNIT = 1000;         // 1000 BV = 1 unit
const MAX_UNITS = 10;             // Hard cap
const ADMIN_CHARGE_PCT = 0.10;    // 10%
const TDS_PCT = 0.02;             // 2%
const NET_PCT = 0.80;             // 80% to main wallet (10% admin + 2% TDS + 8% Savings Wallet)

/**
 * Recursively fetches all descendant ObjectIds beginning from `startNodeId`.
 * Uses an iterative BFS queue to avoid stack overflow on deep trees.
 */
/**
 * Sum all `SelfRepurchaseBVEntry` bvAmounts for a set of userIds within a calendar month.
 * Returns a plain Number.
 */
// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const beginnerBonusService = {

    /**
     * Calculate a single user's unit count for a given year/month.
     * Returns the full breakdown for transparency.
     *
     * @returns {Object} { leftBV, rightBV, personalBV, adjustedLeft, adjustedRight, finalUnits, weakerSide }
     */
    calculateUserUnits: async (userId, year, month, _prebuiltLookup = null) => {
        const User = (await import('../../models/User.model.js')).default;
        const SelfRepurchaseBVEntry = (await import('../../models/SelfRepurchaseBVEntry.model.js')).default;

        const lookup = _prebuiltLookup || await getTreeLookup(User);
        const userNode = lookup.get(userId.toString());
        if (!userNode) return { leftBV: 0, rightBV: 0, personalBV: 0, adjustedLeft: 0, adjustedRight: 0, finalUnits: 0, weakerSide: null };

        // Step 1: Collect all descendants on each leg for THIS month's fresh BV
        const leftDescendants  = getDescendantIds(lookup, userNode.leftChild);
        const rightDescendants = getDescendantIds(lookup, userNode.rightChild);

        const freshLeftBV  = await sumRepurchaseBV(SelfRepurchaseBVEntry, leftDescendants, year, month);
        const freshRightBV = await sumRepurchaseBV(SelfRepurchaseBVEntry, rightDescendants, year, month);

        // Step 2: Fetch carry-forward from last month
        const state = await BeginnerBonusState.findOne({ userId }).lean();
        const carryLeft  = state ? (state.carryForwardLeft  || 0) : 0;
        const carryRight = state ? (state.carryForwardRight || 0) : 0;

        const totalLeft  = freshLeftBV  + carryLeft;
        const totalRight = freshRightBV + carryRight;

        // Step 3: Add user's own personal BV (from repurchases this month) to WEAKER leg
        const personalEntries = await SelfRepurchaseBVEntry.find({ userId, year, month }).lean();
        const personalBV = personalEntries.reduce((acc, e) => acc + (e.bvAmount || 0), 0);

        let adjustedLeft  = totalLeft;
        let adjustedRight = totalRight;
        let weakerSide = null;

        if (personalBV > 0) {
            if (totalLeft <= totalRight) {
                // Left is weaker or equal — add to left
                adjustedLeft  = totalLeft + personalBV;
                weakerSide = 'left';
            } else {
                // Right is weaker — add to right
                adjustedRight = totalRight + personalBV;
                weakerSide = 'right';
            }
        }

        // Step 4: Unit calculation — use the LOWER adjusted leg
        const matchedBV  = Math.min(adjustedLeft, adjustedRight);
        const rawUnits   = Math.floor(matchedBV / BV_PER_UNIT);
        const finalUnits = Math.min(rawUnits, MAX_UNITS);

        return {
            leftBV: totalLeft,
            rightBV: totalRight,
            personalBV,
            adjustedLeft,
            adjustedRight,
            finalUnits,
            weakerSide,
            carryLeft,
            carryRight
        };
    },

    /**
     * Main month-end engine:
     * 1. Computes all users' units.
     * 2. Creates / upserts BeginnerBonusPool record.
     * 3. Stores carry-forward in BeginnerBonusState.
     * 4. Creates BeginnerBonusWalletCredit records (pending — wallet credited separately on 1st).
     *
     * @param {number} year  - Calendar year (IST)
     * @param {number} month - Calendar month 1–12 (IST)
     */
    runMonthEndDistribution: async (year, month) => {
        console.log(chalk.magenta(`[BeginnerBonus] Starting month-end distribution for ${year}-${month}...`));

        // Prevent double-running
        const existing = await BeginnerBonusPool.findOne({ year, month });
        if (existing && existing.status === 'distributed') {
            console.warn(chalk.yellow(`[BeginnerBonus] Already distributed for ${year}-${month}. Skipping.`));
            return existing;
        }

        const User = (await import('../../models/User.model.js')).default;
        const SelfRepurchaseBVEntry = (await import('../../models/SelfRepurchaseBVEntry.model.js')).default;

        // Pre-build tree lookup once for entire batch
        invalidateTreeCache();
        const lookup = await getTreeLookup(User);

        // ── Step A: Company total BV for this month (fresh purchases only) ────
        const allEntries = await SelfRepurchaseBVEntry.find({ year, month }).lean();
        const companyTotalBV = allEntries.reduce((acc, e) => acc + (e.bvAmount || 0), 0);
        console.log(chalk.cyan(`[BeginnerBonus] Company BV for ${year}-${month}: ${companyTotalBV}`));

        if (companyTotalBV === 0) {
            const pool = await BeginnerBonusPool.findOneAndUpdate(
                { year, month },
                { companyTotalBV: 0, poolAmount: 0, totalUnits: 0, status: 'held', notes: 'No company BV this month.' },
                { upsert: true, new: true }
            );
            return pool;
        }

        // ── Step B: Get all active users ──────────────────────────────────────
        const allUsers = await User.find({ status: 'active', isFirstPurchaseDone: true }).select('_id memberId leftChild rightChild').lean();
        console.log(chalk.cyan(`[BeginnerBonus] Computing units for ${allUsers.length} eligible users...`));

        // ── Step C: Calculate units for each user ─────────────────────────────
        const userResults = [];

        for (const u of allUsers) {
            const calc = await beginnerBonusService.calculateUserUnits(u._id, year, month, lookup);
            if (calc.finalUnits > 0) {
                userResults.push({ user: u, calc });
            }

            // Compute and save carry-forward for THIS user
            // stronger - weaker = carry-forward; weaker resets to 0
            const strongerBV = Math.max(calc.adjustedLeft, calc.adjustedRight);
            const weakerBV   = Math.min(calc.adjustedLeft, calc.adjustedRight);
            const leftIsStronger = calc.adjustedLeft >= calc.adjustedRight;

            const newCarryLeft  = leftIsStronger ? (strongerBV - weakerBV) : 0;
            const newCarryRight = leftIsStronger ? 0 : (strongerBV - weakerBV);

            await BeginnerBonusState.findOneAndUpdate(
                { userId: u._id },
                {
                    userId: u._id,
                    memberId: u.memberId,
                    carryForwardLeft:  newCarryLeft,
                    carryForwardRight: newCarryRight,
                    lastProcessedYear:  year,
                    lastProcessedMonth: month
                },
                { upsert: true }
            );
        }

        // ── Step D: Build pool ────────────────────────────────────────────────
        const poolAmount  = companyTotalBV * POOL_PERCENT;
        const totalUnits  = userResults.reduce((acc, r) => acc + r.calc.finalUnits, 0);
        const perUnitValue = totalUnits > 0 ? poolAmount / totalUnits : 0;

        const eligibleUserIds = userResults.map(r => r.user._id);

        let pool;
        if (existing) {
            existing.companyTotalBV   = companyTotalBV;
            existing.poolAmount       = poolAmount;
            existing.totalUnits       = totalUnits;
            existing.perUnitValue     = perUnitValue;
            existing.eligibleUserCount = userResults.length;
            existing.eligibleUserIds  = eligibleUserIds;
            existing.status           = userResults.length > 0 ? 'pending' : 'held';
            pool = await existing.save();
        } else {
            pool = await BeginnerBonusPool.create({
                year,
                month,
                companyTotalBV,
                poolAmount,
                totalUnits,
                perUnitValue,
                eligibleUserCount: userResults.length,
                eligibleUserIds,
                status: userResults.length > 0 ? 'pending' : 'held'
            });
        }

        if (userResults.length === 0) {
            console.warn(chalk.yellow(`[BeginnerBonus] No eligible users for ${year}-${month}.`));
            return pool;
        }

        // ── Step E: Create wallet credit records (pending — credited on 1st) ─
        for (const { user, calc } of userResults) {
            const grossCredit = perUnitValue * calc.finalUnits;
            const adminCharge = grossCredit * ADMIN_CHARGE_PCT;
            const tds         = grossCredit * TDS_PCT;
            const netCredit   = grossCredit * NET_PCT;

            await BeginnerBonusWalletCredit.findOneAndUpdate(
                { userId: user._id, year, month },
                {
                    userId:       user._id,
                    memberId:     user.memberId,
                    year,
                    month,
                    leftLegBV:    calc.leftBV,
                    rightLegBV:   calc.rightBV,
                    personalBV:   calc.personalBV,
                    adjustedLeft:  calc.adjustedLeft,
                    adjustedRight: calc.adjustedRight,
                    finalUnits:   calc.finalUnits,
                    poolId:       pool._id,
                    perUnitValue,
                    grossCredit,
                    adminCharge,
                    tds,
                    netCredit,
                    creditedAt:   null // Filled in when wallet is credited
                },
                { upsert: true }
            );
        }

        console.log(chalk.green(`[BeginnerBonus] Month-end distribution staged for ${year}-${month}. ${userResults.length} users, ${totalUnits} total units, pool ₹${poolAmount.toFixed(2)}.`));
        return pool;
    },

    /**
     * Credit all pending wallet entries for a specific month.
     * Called on the 1st of each month at 00:00 IST.
     *
     * @param {number} year
     * @param {number} month
     */
    applyWalletCredits: async (year, month) => {
        console.log(chalk.magenta(`[BeginnerBonus] Applying wallet credits for ${year}-${month}...`));

        const pool = await BeginnerBonusPool.findOne({ year, month });
        if (!pool || pool.status !== 'pending') {
            console.warn(chalk.yellow(`[BeginnerBonus] No pending pool for ${year}-${month}. Skipping wallet credits.`));
            return;
        }

        const credits = await BeginnerBonusWalletCredit.find({ year, month, creditedAt: null });
        const creditedAt = moment().tz(TIMEZONE).toDate();

        for (const credit of credits) {
            // Credit wallet: update UserFinance wallet balance
            await UserFinance.findOneAndUpdate(
                { user: credit.userId },
                {
                    $inc: {
                        'wallet.totalEarnings':    credit.netCredit,
                        'wallet.availableBalance': credit.netCredit
                    }
                }
            );

            credit.creditedAt = creditedAt;
            await credit.save();

            // ISOLATED: deposit an extra 8% of gross into the Savings Wallet
            await savingsWalletService.credit({
                userId: credit.userId,
                memberId: credit.memberId,
                sourceType: 'beginner-bonus',
                grossAmount: credit.grossCredit
            });

            // ISOLATED: record the 2% TDS deducted from this income (admin reporting only)
            await tdsLedgerService.record({
                userId: credit.userId,
                memberId: credit.memberId,
                sourceType: 'beginner-bonus',
                grossAmount: credit.grossCredit
            });

            console.log(chalk.green(`[BeginnerBonus] Credited ₹${credit.netCredit.toFixed(2)} to ${credit.memberId}`));
        }

        pool.status       = 'distributed';
        pool.distributedAt = creditedAt;
        await pool.save();

        console.log(chalk.green(`[BeginnerBonus] ✅ All credits applied for ${year}-${month}.`));
    },

    // ─────────────────────────────────────────────────────────────────────────
    // USER-FACING QUERIES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Current month status for a user: BV breakdown + estimated units.
     */
    getUserStatus: async (userId) => {
        const now = moment().tz(TIMEZONE);
        const year  = now.year();
        const month = now.month() + 1;

        const User  = (await import('../../models/User.model.js')).default;
        const lookup = await getTreeLookup(User);
        const calc  = await beginnerBonusService.calculateUserUnits(userId, year, month, lookup);
        const state = await BeginnerBonusState.findOne({ userId }).lean();

        return {
            currentMonth: { year, month },
            carryForward: {
                left:  state ? (state.carryForwardLeft  || 0) : 0,
                right: state ? (state.carryForwardRight || 0) : 0
            },
            bvBreakdown: {
                freshLeftBV:   calc.leftBV  - (state ? (state.carryForwardLeft  || 0) : 0),
                freshRightBV:  calc.rightBV - (state ? (state.carryForwardRight || 0) : 0),
                carryLeftBV:   state ? (state.carryForwardLeft  || 0) : 0,
                carryRightBV:  state ? (state.carryForwardRight || 0) : 0,
                totalLeftBV:   calc.leftBV,
                totalRightBV:  calc.rightBV,
                personalBV:    calc.personalBV,
                adjustedLeft:  calc.adjustedLeft,
                adjustedRight: calc.adjustedRight,
                weakerSide:    calc.weakerSide
            },
            units: {
                estimated:    calc.finalUnits,
                cappingLimit: MAX_UNITS,
                cappingReached: calc.finalUnits >= MAX_UNITS
            }
        };
    },

    /**
     * Full payout history for a user.
     */
    getUserHistory: async (userId) => {
        const credits = await BeginnerBonusWalletCredit.find({ userId })
            .sort({ year: -1, month: -1 })
            .lean();
        return credits;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN QUERIES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Paginated list of all pool records.
     */
    getAdminPoolList: async (page = 1, limit = 12) => {
        const skip = (page - 1) * limit;
        const [pools, total] = await Promise.all([
            BeginnerBonusPool.find().sort({ year: -1, month: -1 }).skip(skip).limit(limit).lean(),
            BeginnerBonusPool.countDocuments()
        ]);
        return { pools, total, page, limit };
    },

    /**
     * Full pool detail for a specific month including all user credits.
     */
    getAdminPoolDetails: async (year, month) => {
        const pool = await BeginnerBonusPool.findOne({ year, month }).lean();
        if (!pool) return null;

        const credits = await BeginnerBonusWalletCredit.find({ year, month })
            .sort({ finalUnits: -1 })
            .lean();

        return { pool, credits };
    },

    /**
     * All history for a specific user (for admin lookup by memberId).
     */
    getAdminUserDetails: async (memberId) => {
        const User = (await import('../../models/User.model.js')).default;
        const user = await User.findOne({ memberId }).select('_id memberId fullName status').lean();
        if (!user) return null;

        const [credits, state] = await Promise.all([
            BeginnerBonusWalletCredit.find({ userId: user._id }).sort({ year: -1, month: -1 }).lean(),
            BeginnerBonusState.findOne({ userId: user._id }).lean()
        ]);

        const currentMonthCalc = await beginnerBonusService.calculateUserUnits(
            user._id,
            moment().tz(TIMEZONE).year(),
            moment().tz(TIMEZONE).month() + 1
        );

        return { user, credits, state, currentMonth: currentMonthCalc };
    },

    /**
     * All active users with their current-month unit estimates (admin overview).
     */
    getAdminCurrentMonthOverview: async () => {
        const User = (await import('../../models/User.model.js')).default;
        const now   = moment().tz(TIMEZONE);
        const year  = now.year();
        const month = now.month() + 1;

        const allUsers = await User.find({ status: 'active', isFirstPurchaseDone: true }).select('_id memberId fullName').lean();

        const lookup = await getTreeLookup(User);

        const results = [];
        for (const u of allUsers) {
            const calc = await beginnerBonusService.calculateUserUnits(u._id, year, month, lookup);
            results.push({
                memberId: u.memberId,
                fullName: u.fullName,
                leftBV:   calc.leftBV,
                rightBV:  calc.rightBV,
                personalBV: calc.personalBV,
                adjustedLeft:  calc.adjustedLeft,
                adjustedRight: calc.adjustedRight,
                weakerSide:    calc.weakerSide,
                adjustedWeakerLeg: Math.min(calc.adjustedLeft, calc.adjustedRight),
                estimatedUnits: calc.finalUnits,
                cappingReached: calc.finalUnits >= MAX_UNITS
            });
        }

        // Sort by estimated units descending
        results.sort((a, b) => b.estimatedUnits - a.estimatedUnits);
        return { year, month, users: results };
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LIVE POOL PREVIEW (read-only, real-time calculation)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * ADMIN: Full live pool preview for the current month.
     * Calculates company BV, pool amount, per-unit value, and each eligible
     * user's estimated gross + net earnings — all in real time without any DB writes.
     *
     * @returns {Object} complete live pool snapshot
     */
    getLivePool: async () => {
        const User = (await import('../../models/User.model.js')).default;
        const SelfRepurchaseBVEntry = (await import('../../models/SelfRepurchaseBVEntry.model.js')).default;

        const now   = moment().tz(TIMEZONE);
        const year  = now.year();
        const month = now.month() + 1;

        // Step 1: Company BV for this month (fresh purchases only — no carry-forwards)
        const allEntries = await SelfRepurchaseBVEntry.find({ year, month }).lean();
        const companyTotalBV = allEntries.reduce((acc, e) => acc + (e.bvAmount || 0), 0);

        const poolAmount = companyTotalBV * POOL_PERCENT;

        // Step 2: Compute each active user's unit count right now
        const lookup = await getTreeLookup(User);
        const allUsers = await User.find({ status: 'active', isFirstPurchaseDone: true })
            .select('_id memberId fullName')
            .lean();

        const userResults = [];
        for (const u of allUsers) {
            const calc = await beginnerBonusService.calculateUserUnits(u._id, year, month, lookup);
            if (calc.finalUnits > 0) {
                userResults.push({ user: u, calc });
            }
        }

        const totalUnits   = userResults.reduce((acc, r) => acc + r.calc.finalUnits, 0);
        const perUnitValue = totalUnits > 0 ? poolAmount / totalUnits : 0;

        // Step 3: Build per-user breakdown
        const userBreakdown = userResults.map(({ user, calc }) => {
            const grossCredit = perUnitValue * calc.finalUnits;
            const netCredit   = grossCredit * NET_PCT;
            const adjustedWeakerLeg = Math.min(calc.adjustedLeft, calc.adjustedRight);
            return {
                memberId:       user.memberId,
                fullName:       user.fullName,
                leftBV:         calc.leftBV,
                rightBV:        calc.rightBV,
                personalBV:     calc.personalBV,
                adjustedLeft:   calc.adjustedLeft,
                adjustedRight:  calc.adjustedRight,
                weakerSide:     calc.weakerSide,
                adjustedWeakerLeg,
                finalUnits:     calc.finalUnits,
                cappingReached: calc.finalUnits >= MAX_UNITS,
                estimatedGross: parseFloat(grossCredit.toFixed(2)),
                estimatedNet:   parseFloat(netCredit.toFixed(2))
            };
        });

        userBreakdown.sort((a, b) => b.estimatedNet - a.estimatedNet);

        return {
            currentMonth: { year, month },
            pool: {
                companyTotalBV,
                poolPercent: POOL_PERCENT * 100,
                poolAmount:  parseFloat(poolAmount.toFixed(2)),
                totalUnits,
                perUnitValue: parseFloat(perUnitValue.toFixed(4)),
                eligibleUserCount: userResults.length
            },
            users: userBreakdown
        };
    },

    /**
     * USER: Live estimate for a single user — their share of the current month's pool.
     *
     * @param {ObjectId|string} userId
     * @returns {Object} user's real-time unit count and estimated earnings
     */
    getUserLiveEstimate: async (userId) => {
        const SelfRepurchaseBVEntry = (await import('../../models/SelfRepurchaseBVEntry.model.js')).default;
        const User = (await import('../../models/User.model.js')).default;

        const now   = moment().tz(TIMEZONE);
        const year  = now.year();
        const month = now.month() + 1;

        // Company BV (fresh this month only)
        const allEntries = await SelfRepurchaseBVEntry.find({ year, month }).lean();
        const companyTotalBV = allEntries.reduce((acc, e) => acc + (e.bvAmount || 0), 0);
        const poolAmount     = companyTotalBV * POOL_PERCENT;

        // All users' total units (needed for per-unit value)
        const allUsers = await User.find({ status: 'active', isFirstPurchaseDone: true })
            .select('_id')
            .lean();

        let totalUnits = 0;
        let myCalc = null;

        for (const u of allUsers) {
            const calc = await beginnerBonusService.calculateUserUnits(u._id, year, month, lookup);
            totalUnits += calc.finalUnits;
            if (u._id.toString() === userId.toString()) {
                myCalc = calc;
            }
        }

        if (!myCalc) {
            myCalc = await beginnerBonusService.calculateUserUnits(userId, year, month, lookup);
        }

        const perUnitValue  = totalUnits > 0 ? poolAmount / totalUnits : 0;
        const grossCredit   = perUnitValue * myCalc.finalUnits;
        const netCredit     = grossCredit * NET_PCT;

        return {
            currentMonth: { year, month },
            companyBV: {
                totalBV:     companyTotalBV,
                poolPercent: POOL_PERCENT * 100,
                poolAmount:  parseFloat(poolAmount.toFixed(2))
            },
            pool: {
                totalUnits,
                perUnitValue:     parseFloat(perUnitValue.toFixed(4)),
                eligibleUsers: allUsers.length
            },
            myEstimate: {
                myUnits:       myCalc.finalUnits,
                cappingLimit:  MAX_UNITS,
                cappingReached: myCalc.finalUnits >= MAX_UNITS,
                grossEarning:  parseFloat(grossCredit.toFixed(2)),
                deduction7pct: parseFloat((grossCredit * (1 - NET_PCT)).toFixed(2)),
                netEarning:    parseFloat(netCredit.toFixed(2))
            }
        };
    }
};

