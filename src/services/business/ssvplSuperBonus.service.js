import mongoose from 'mongoose';
import moment from 'moment-timezone';
import chalk from 'chalk';

import SsvplSuperBonusState from '../../models/SsvplSuperBonusState.model.js';
import SsvplSuperBonusPool from '../../models/SsvplSuperBonusPool.model.js';
import SsvplSuperBonusWalletCredit from '../../models/SsvplSuperBonusWalletCredit.model.js';
import UserFinance from '../../models/UserFinance.model.js';
import { savingsWalletService } from './savingsWallet.service.js';
import { tdsLedgerService } from './tdsLedger.service.js';
import { getTreeLookup, getDescendantIds, sumRepurchaseBV, invalidateTreeCache } from './_treeHelper.js';

const TIMEZONE = 'Asia/Kolkata';

// ── Constants — 2% Pool, 25,00,000 BV per Unit, No Unit Capping ───────────────
const POOL_PERCENT     = 0.02;     // 2% of company BV
const BV_PER_UNIT      = 2500000;  // 25,00,000 BV = 1 unit
const ADMIN_CHARGE_PCT = 0.10;     // 10%
const TDS_PCT          = 0.02;     // 2%
const NET_PCT          = 0.80;     // 80% to main wallet (10% admin + 2% TDS + 8% Savings Wallet)

const _getCycleQuery = (cycleYear) => {
    // cycleYear refers to the year the cycle ENDS in March.
    // e.g. cycleYear = 2026 means April 1, 2025 to March 31, 2026.
    return {
        $or: [
            { year: cycleYear - 1, month: { $in: [4, 5, 6, 7, 8, 9, 10, 11, 12] } },
            { year: cycleYear, month: { $in: [1, 2, 3] } }
        ]
    };
};

const _sumRepurchaseBVCycle = async (SelfRepurchaseBVEntry, userIds, cycleYear) => {
    if (!userIds || userIds.length === 0) return 0;
    const query = { userId: { $in: userIds }, ..._getCycleQuery(cycleYear) };
    const entries = await SelfRepurchaseBVEntry.find(query).lean();
    return entries.reduce((acc, e) => acc + (e.bvAmount || 0), 0);
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const ssvplSuperBonusService = {

    /**
     * Determines the current active cycle based on the date.
     * Starts April 1, Ends March 31.
     */
    getCurrentCycleYear: () => {
        const now = moment().tz(TIMEZONE);
        const y = now.year();
        const m = now.month() + 1; // 1-12

        if (m >= 4 && m <= 12) {
            return y + 1;
        } else {
            return y;
        }
    },

    /**
     * Calculate a single user's SSVPL Super Bonus unit count over a 12-month cycle.
     * 25,00,000 BV = 1 unit. No capping.
     */
    calculateUserUnits: async (userId, cycleYear) => {
        const User = (await import('../../models/User.model.js')).default;
        const SelfRepurchaseBVEntry = (await import('../../models/SelfRepurchaseBVEntry.model.js')).default;

        const lookup = _prebuiltLookup || await getTreeLookup(User);
        const userNode = lookup.get(userId.toString());
        if (!userNode) return { leftBV: 0, rightBV: 0, personalBV: 0, adjustedLeft: 0, adjustedRight: 0, finalUnits: 0, weakerSide: null, carryLeft: 0, carryRight: 0 };

        // Fresh leg BV over the 12-month cycle
        const leftDesc  = getDescendantIds(lookup, userNode.leftChild);
        const rightDesc = getDescendantIds(lookup, userNode.rightChild);

        const freshLeft  = await _sumRepurchaseBVCycle(SelfRepurchaseBVEntry, leftDesc,  cycleYear);
        const freshRight = await _sumRepurchaseBVCycle(SelfRepurchaseBVEntry, rightDesc, cycleYear);

        // Add carry-forward
        const state      = await SsvplSuperBonusState.findOne({ userId }).lean();
        const carryLeft  = state ? (state.carryForwardLeft  || 0) : 0;
        const carryRight = state ? (state.carryForwardRight || 0) : 0;

        const totalLeft  = freshLeft  + carryLeft;
        const totalRight = freshRight + carryRight;

        // Add personal BV to weaker leg over the 12-month cycle
        const personalQuery = { userId, ..._getCycleQuery(cycleYear) };
        const personalEntries = await SelfRepurchaseBVEntry.find(personalQuery).lean();
        const personalBV = personalEntries.reduce((acc, e) => acc + (e.bvAmount || 0), 0);

        let adjustedLeft  = totalLeft;
        let adjustedRight = totalRight;
        let weakerSide    = null;

        if (personalBV > 0) {
            if (totalLeft <= totalRight) {
                adjustedLeft = totalLeft + personalBV;
                weakerSide   = 'left';
            } else {
                adjustedRight = totalRight + personalBV;
                weakerSide    = 'right';
            }
        }

        const matchedBV  = Math.min(adjustedLeft, adjustedRight);
        const finalUnits = Math.floor(matchedBV / BV_PER_UNIT);

        return { leftBV: totalLeft, rightBV: totalRight, personalBV, adjustedLeft, adjustedRight, finalUnits, weakerSide, carryLeft, carryRight };
    },

    /**
     * Cycle-end engine: compute units, upsert pool, save carry-forwards, stage credits.
     */
    runCycleEndDistribution: async (cycleYear) => {
        console.log(chalk.cyan(`[SsvplSuperBonus] Starting yearly distribution for Cycle Year: ${cycleYear}...`));

        const existing = await SsvplSuperBonusPool.findOne({ cycleYear });
        if (existing && existing.status === 'distributed') {
            console.warn(chalk.yellow(`[SsvplSuperBonus] Already distributed for Cycle Year ${cycleYear}.`));
            return existing;
        }

        const User                  = (await import('../../models/User.model.js')).default;
        const SelfRepurchaseBVEntry = (await import('../../models/SelfRepurchaseBVEntry.model.js')).default;

        invalidateTreeCache();
        const lookup = await getTreeLookup(User);

        const allEntries     = await SelfRepurchaseBVEntry.find(_getCycleQuery(cycleYear)).lean();
        const companyTotalBV = allEntries.reduce((acc, e) => acc + (e.bvAmount || 0), 0);

        if (companyTotalBV === 0) {
            return SsvplSuperBonusPool.findOneAndUpdate(
                { cycleYear },
                { companyTotalBV: 0, poolAmount: 0, totalUnits: 0, status: 'held', notes: 'No company BV in this 12-month cycle.' },
                { upsert: true, new: true }
            );
        }

        const allUsers = await User.find({ status: 'active', isFirstPurchaseDone: true })
            .select('_id memberId').lean();

        const userResults = [];
        for (const u of allUsers) {
            const calc = await ssvplSuperBonusService.calculateUserUnits(u._id, cycleYear, lookup);
            if (calc.finalUnits > 0) userResults.push({ user: u, calc });

            // Carry-forward
            const strongerBV     = Math.max(calc.adjustedLeft, calc.adjustedRight);
            const weakerBV       = Math.min(calc.adjustedLeft, calc.adjustedRight);
            const leftIsStronger = calc.adjustedLeft >= calc.adjustedRight;

            await SsvplSuperBonusState.findOneAndUpdate(
                { userId: u._id },
                {
                    userId:                 u._id,
                    memberId:               u.memberId,
                    carryForwardLeft:       leftIsStronger ? (strongerBV - weakerBV) : 0,
                    carryForwardRight:      leftIsStronger ? 0 : (strongerBV - weakerBV),
                    lastProcessedCycleYear: cycleYear
                },
                { upsert: true }
            );
        }

        const poolAmount      = companyTotalBV * POOL_PERCENT;
        const totalUnits      = userResults.reduce((acc, r) => acc + r.calc.finalUnits, 0);
        const perUnitValue    = totalUnits > 0 ? poolAmount / totalUnits : 0;
        const eligibleUserIds = userResults.map(r => r.user._id);

        let pool;
        if (existing) {
            existing.companyTotalBV    = companyTotalBV;
            existing.poolAmount        = poolAmount;
            existing.totalUnits        = totalUnits;
            existing.perUnitValue      = perUnitValue;
            existing.eligibleUserCount = userResults.length;
            existing.eligibleUserIds   = eligibleUserIds;
            existing.status            = userResults.length > 0 ? 'pending' : 'held';
            pool = await existing.save();
        } else {
            pool = await SsvplSuperBonusPool.create({
                cycleYear, companyTotalBV, poolAmount, totalUnits, perUnitValue,
                eligibleUserCount: userResults.length,
                eligibleUserIds,
                status: userResults.length > 0 ? 'pending' : 'held'
            });
        }

        for (const { user, calc } of userResults) {
            const grossCredit = perUnitValue * calc.finalUnits;
            const netCredit   = grossCredit * NET_PCT;

            await SsvplSuperBonusWalletCredit.findOneAndUpdate(
                { userId: user._id, cycleYear },
                {
                    userId:        user._id,
                    memberId:      user.memberId,
                    cycleYear,
                    leftLegBV:     calc.leftBV,
                    rightLegBV:    calc.rightBV,
                    personalBV:    calc.personalBV,
                    adjustedLeft:  calc.adjustedLeft,
                    adjustedRight: calc.adjustedRight,
                    finalUnits:    calc.finalUnits,
                    poolId:        pool._id,
                    perUnitValue,
                    grossCredit,
                    adminCharge:   grossCredit * ADMIN_CHARGE_PCT,
                    tds:           grossCredit * TDS_PCT,
                    netCredit,
                    creditedAt:    null
                },
                { upsert: true }
            );
        }

        return pool;
    },

    /**
     * Apply pending wallet credits for a completed cycle.
     */
    applyWalletCredits: async (cycleYear) => {
        const pool = await SsvplSuperBonusPool.findOne({ cycleYear });
        if (!pool || pool.status !== 'pending') return;

        const credits    = await SsvplSuperBonusWalletCredit.find({ cycleYear, creditedAt: null });
        const creditedAt = moment().tz(TIMEZONE).toDate();

        for (const credit of credits) {
            await UserFinance.findOneAndUpdate(
                { user: credit.userId },
                { $inc: { 'wallet.totalEarnings': credit.netCredit, 'wallet.availableBalance': credit.netCredit } }
            );
            credit.creditedAt = creditedAt;
            await credit.save();

            // ISOLATED: deposit an extra 8% of gross into the Savings Wallet
            await savingsWalletService.credit({
                userId: credit.userId,
                memberId: credit.memberId,
                sourceType: 'ssvpl-super-bonus',
                grossAmount: credit.grossCredit
            });

            // ISOLATED: record the 2% TDS deducted from this income (admin reporting only)
            await tdsLedgerService.record({
                userId: credit.userId,
                memberId: credit.memberId,
                sourceType: 'ssvpl-super-bonus',
                grossAmount: credit.grossCredit
            });
        }

        pool.status        = 'distributed';
        pool.distributedAt = creditedAt;
        await pool.save();
    },

    getUserStatus: async (userId) => {
        const cycleYear = ssvplSuperBonusService.getCurrentCycleYear();
        const User  = (await import('../../models/User.model.js')).default;
        const lookup = await getTreeLookup(User);
        const calc  = await ssvplSuperBonusService.calculateUserUnits(userId, cycleYear, lookup);
        const state = await SsvplSuperBonusState.findOne({ userId }).lean();

        return {
            currentCycle: { cycleYear },
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
                estimated:  calc.finalUnits,
                bvPerUnit:  BV_PER_UNIT,
                noCapping:  true
            }
        };
    },

    getUserHistory: async (userId) =>
        SsvplSuperBonusWalletCredit.find({ userId }).sort({ cycleYear: -1 }).lean(),

    getLivePool: async () => {
        const User                  = (await import('../../models/User.model.js')).default;
        const SelfRepurchaseBVEntry = (await import('../../models/SelfRepurchaseBVEntry.model.js')).default;

        const cycleYear = ssvplSuperBonusService.getCurrentCycleYear();

        const allEntries     = await SelfRepurchaseBVEntry.find(_getCycleQuery(cycleYear)).lean();
        const companyTotalBV = allEntries.reduce((acc, e) => acc + (e.bvAmount || 0), 0);
        const poolAmount     = companyTotalBV * POOL_PERCENT;

        const allUsers = await User.find({ status: 'active', isFirstPurchaseDone: true })
            .select('_id memberId fullName').lean();

        const lookup = await getTreeLookup(User);

        const userResults = [];
        for (const u of allUsers) {
            const calc = await ssvplSuperBonusService.calculateUserUnits(u._id, cycleYear, lookup);
            if (calc.finalUnits > 0) userResults.push({ user: u, calc });
        }

        const totalUnits   = userResults.reduce((acc, r) => acc + r.calc.finalUnits, 0);
        const perUnitValue = totalUnits > 0 ? poolAmount / totalUnits : 0;

        const userBreakdown = userResults.map(({ user, calc }) => {
            const grossCredit = perUnitValue * calc.finalUnits;
            const netCredit   = grossCredit * NET_PCT;
            return {
                memberId:           user.memberId,
                fullName:           user.fullName,
                leftBV:             calc.leftBV,
                rightBV:            calc.rightBV,
                personalBV:         calc.personalBV,
                adjustedLeft:       calc.adjustedLeft,
                adjustedRight:      calc.adjustedRight,
                weakerSide:         calc.weakerSide,
                adjustedWeakerLeg: Math.min(calc.adjustedLeft, calc.adjustedRight),
                finalUnits:         calc.finalUnits,
                estimatedGross:     parseFloat(grossCredit.toFixed(2)),
                estimatedNet:       parseFloat(netCredit.toFixed(2))
            };
        });

        userBreakdown.sort((a, b) => b.estimatedNet - a.estimatedNet);

        return {
            currentCycle: { cycleYear },
            pool: {
                companyTotalBV,
                poolPercent:      POOL_PERCENT * 100,
                poolAmount:       parseFloat(poolAmount.toFixed(2)),
                totalUnits,
                perUnitValue:     parseFloat(perUnitValue.toFixed(4)),
                eligibleUserCount: userResults.length
            },
            users: userBreakdown
        };
    },

    getUserLiveEstimate: async (userId) => {
        const SelfRepurchaseBVEntry = (await import('../../models/SelfRepurchaseBVEntry.model.js')).default;
        const User                  = (await import('../../models/User.model.js')).default;

        const cycleYear = ssvplSuperBonusService.getCurrentCycleYear();

        const allEntries     = await SelfRepurchaseBVEntry.find(_getCycleQuery(cycleYear)).lean();
        const companyTotalBV = allEntries.reduce((acc, e) => acc + (e.bvAmount || 0), 0);
        const poolAmount     = companyTotalBV * POOL_PERCENT;

        const allUsers = await User.find({ status: 'active', isFirstPurchaseDone: true })
            .select('_id').lean();

        const lookup = await getTreeLookup(User);

        let totalUnits = 0;
        let myCalc     = null;

        for (const u of allUsers) {
            const calc = await ssvplSuperBonusService.calculateUserUnits(u._id, cycleYear, lookup);
            totalUnits += calc.finalUnits;
            if (u._id.toString() === userId.toString()) myCalc = calc;
        }
        if (!myCalc) myCalc = await ssvplSuperBonusService.calculateUserUnits(userId, cycleYear, lookup);

        const perUnitValue = totalUnits > 0 ? poolAmount / totalUnits : 0;
        const grossCredit  = perUnitValue * myCalc.finalUnits;
        const netCredit    = grossCredit * NET_PCT;

        return {
            currentCycle: { cycleYear },
            companyBV: {
                totalBV:     companyTotalBV,
                poolPercent: POOL_PERCENT * 100,
                poolAmount:  parseFloat(poolAmount.toFixed(2))
            },
            pool: {
                totalUnits,
                perUnitValue:  parseFloat(perUnitValue.toFixed(4)),
                eligibleUsers: allUsers.length
            },
            myEstimate: {
                myUnits:       myCalc.finalUnits,
                bvPerUnit:     BV_PER_UNIT,
                noCapping:     true,
                grossEarning:  parseFloat(grossCredit.toFixed(2)),
                deduction7pct: parseFloat((grossCredit * (1 - NET_PCT)).toFixed(2)),
                netEarning:    parseFloat(netCredit.toFixed(2))
            }
        };
    },

    getAdminPoolList: async (page = 1, limit = 12) => {
        const skip = (page - 1) * limit;
        const [pools, total] = await Promise.all([
            SsvplSuperBonusPool.find().sort({ cycleYear: -1 }).skip(skip).limit(limit).lean(),
            SsvplSuperBonusPool.countDocuments()
        ]);
        return { pools, total, page, limit };
    },

    getAdminPoolDetails: async (cycleYear) => {
        const pool = await SsvplSuperBonusPool.findOne({ cycleYear }).lean();
        if (!pool) return null;
        const credits = await SsvplSuperBonusWalletCredit.find({ cycleYear })
            .sort({ finalUnits: -1 }).lean();
        return { pool, credits };
    },

    getAdminUserDetails: async (memberId) => {
        const User = (await import('../../models/User.model.js')).default;
        const user = await User.findOne({ memberId }).select('_id memberId fullName status').lean();
        if (!user) return null;

        const [credits, state] = await Promise.all([
            SsvplSuperBonusWalletCredit.find({ userId: user._id }).sort({ cycleYear: -1 }).lean(),
            SsvplSuperBonusState.findOne({ userId: user._id }).lean()
        ]);

        const cycleYear = ssvplSuperBonusService.getCurrentCycleYear();
        const currentCycleCalc = await ssvplSuperBonusService.calculateUserUnits(user._id, cycleYear, lookup);

        return { user, credits, state, currentCycle: currentCycleCalc };
    },

    getAdminCurrentCycleOverview: async () => {
        const User  = (await import('../../models/User.model.js')).default;
        const cycleYear = ssvplSuperBonusService.getCurrentCycleYear();

        const allUsers = await User.find({ status: 'active', isFirstPurchaseDone: true })
            .select('_id memberId fullName').lean();

        const lookup = await getTreeLookup(User);

        const results = [];
        for (const u of allUsers) {
            const calc = await ssvplSuperBonusService.calculateUserUnits(u._id, cycleYear, lookup);
            results.push({
                memberId:          u.memberId,
                fullName:          u.fullName,
                leftBV:            calc.leftBV,
                rightBV:           calc.rightBV,
                personalBV:        calc.personalBV,
                adjustedLeft:      calc.adjustedLeft,
                adjustedRight:     calc.adjustedRight,
                weakerSide:        calc.weakerSide,
                adjustedWeakerLeg: Math.min(calc.adjustedLeft, calc.adjustedRight),
                estimatedUnits:    calc.finalUnits
            });
        }
        results.sort((a, b) => b.estimatedUnits - a.estimatedUnits);
        return { cycleYear, users: results };
    }
};
