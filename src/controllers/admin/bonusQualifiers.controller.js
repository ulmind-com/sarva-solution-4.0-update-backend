import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import User from '../../models/User.model.js';

import BeginnerBonusPool from '../../models/BeginnerBonusPool.model.js';
import BeginnerBonusWalletCredit from '../../models/BeginnerBonusWalletCredit.model.js';
import StartUpBonusPool from '../../models/StartUpBonusPool.model.js';
import StartUpBonusWalletCredit from '../../models/StartUpBonusWalletCredit.model.js';
import LeadershipBonusPool from '../../models/LeadershipBonusPool.model.js';
import LeadershipBonusWalletCredit from '../../models/LeadershipBonusWalletCredit.model.js';
import TourFundPool from '../../models/TourFundPool.model.js';
import TourFundWalletCredit from '../../models/TourFundWalletCredit.model.js';
import HealthEducationBonusPool from '../../models/HealthEducationBonusPool.model.js';
import HealthEducationBonusWalletCredit from '../../models/HealthEducationBonusWalletCredit.model.js';
import BikeCarFundPool from '../../models/BikeCarFundPool.model.js';
import BikeCarFundWalletCredit from '../../models/BikeCarFundWalletCredit.model.js';
import HouseFundPool from '../../models/HouseFundPool.model.js';
import HouseFundWalletCredit from '../../models/HouseFundWalletCredit.model.js';
import RoyaltyFundPool from '../../models/RoyaltyFundPool.model.js';
import RoyaltyFundWalletCredit from '../../models/RoyaltyFundWalletCredit.model.js';
import SsvplSuperBonusPool from '../../models/SsvplSuperBonusPool.model.js';
import SsvplSuperBonusWalletCredit from '../../models/SsvplSuperBonusWalletCredit.model.js';

/**
 * Bonus Qualifiers (ISOLATED — read only)
 * ---------------------------------------------------------------------------
 * Every pool screen shows a qualifier COUNT but no way to see WHO those
 * qualifiers were. These endpoints answer that: given a bonus and a period,
 * return the actual members who were credited, with their per-user breakdown.
 *
 * Read-only by design. Nothing here computes, distributes, credits or writes.
 * It reads the pool document and its wallet-credit rows exactly as the
 * distribution already wrote them, so the numbers always agree with the
 * pool screen.
 *
 * Self Repurchase Bonus is deliberately NOT included — it already has its own
 * per-user distribution screen.
 *
 * Qualifiers are always resolved by `poolId`, never by year/month on the
 * credit rows, because House Fund / Royalty Fund / SSVPL Super credits do not
 * carry a period of their own.
 */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * periodType tells the caller which query parameters a bonus expects:
 *   'monthly'     -> year + month           (or month=YYYY-MM)
 *   'half-yearly' -> cycleYear + cycleNumber (1 or 2)
 *   'yearly'      -> cycleYear
 */
const BONUS_REGISTRY = {
    'beginner': {
        label: 'Beginner Matching Bonus',
        periodType: 'monthly',
        Pool: BeginnerBonusPool,
        Credit: BeginnerBonusWalletCredit
    },
    'startup': {
        label: 'Start Up Bonus',
        periodType: 'monthly',
        Pool: StartUpBonusPool,
        Credit: StartUpBonusWalletCredit
    },
    'leadership': {
        label: 'Leadership Bonus',
        periodType: 'monthly',
        Pool: LeadershipBonusPool,
        Credit: LeadershipBonusWalletCredit
    },
    'tour-fund': {
        label: 'Tour Fund',
        periodType: 'monthly',
        Pool: TourFundPool,
        Credit: TourFundWalletCredit
    },
    'health-education': {
        label: 'Health & Education Bonus',
        periodType: 'monthly',
        Pool: HealthEducationBonusPool,
        Credit: HealthEducationBonusWalletCredit
    },
    'bike-car-fund': {
        label: 'Bike & Car Fund',
        periodType: 'monthly',
        Pool: BikeCarFundPool,
        Credit: BikeCarFundWalletCredit
    },
    'house-fund': {
        label: 'House Fund',
        periodType: 'half-yearly',
        Pool: HouseFundPool,
        Credit: HouseFundWalletCredit
    },
    'royalty-fund': {
        label: 'Royalty Fund',
        periodType: 'yearly',
        Pool: RoyaltyFundPool,
        Credit: RoyaltyFundWalletCredit
    },
    'ssvpl-super': {
        label: 'SSVPL Super Bonus',
        periodType: 'yearly',
        Pool: SsvplSuperBonusPool,
        Credit: SsvplSuperBonusWalletCredit
    }
};

const resolveBonus = (bonusType) => {
    const entry = BONUS_REGISTRY[String(bonusType || '').toLowerCase()];
    if (!entry) {
        throw new ApiError(400,
            `Unknown bonus "${bonusType}". Supported: ${Object.keys(BONUS_REGISTRY).join(', ')}`);
    }
    return entry;
};

/** Human label for whichever period shape the pool uses. */
const periodLabel = (periodType, pool) => {
    if (periodType === 'monthly') return `${MONTH_NAMES[(pool.month || 1) - 1]} ${pool.year}`;
    if (periodType === 'half-yearly') return `Cycle ${pool.cycleNumber} of ${pool.cycleYear}`;
    return `${pool.cycleYear}`;
};

/** Just the period fields, so the caller can echo them back. */
const periodOf = (periodType, pool) => {
    if (periodType === 'monthly') return { year: pool.year, month: pool.month };
    if (periodType === 'half-yearly') return { cycleYear: pool.cycleYear, cycleNumber: pool.cycleNumber };
    return { cycleYear: pool.cycleYear };
};

/** Newest period first, whatever the period shape is. */
const sortForPeriod = (periodType) => {
    if (periodType === 'monthly') return { year: -1, month: -1 };
    if (periodType === 'half-yearly') return { cycleYear: -1, cycleNumber: -1 };
    return { cycleYear: -1 };
};

/**
 * Build the pool lookup filter from the query string.
 * `poolId` wins when given; otherwise the period parameters for that bonus.
 */
const buildPoolFilter = (periodType, query) => {
    if (query.poolId) {
        if (!mongoose.Types.ObjectId.isValid(query.poolId)) {
            throw new ApiError(400, 'poolId is not a valid id');
        }
        return { _id: new mongoose.Types.ObjectId(query.poolId) };
    }

    if (periodType === 'monthly') {
        let year = query.year;
        let month = query.month;

        // Also accept month=YYYY-MM, which is what the pool screens already use.
        if (month && String(month).includes('-')) {
            const [y, m] = String(month).split('-');
            year = y;
            month = m;
        }
        if (!year || !month) {
            throw new ApiError(400, 'Provide poolId, or year and month (month may also be given as YYYY-MM)');
        }

        year = parseInt(year, 10);
        month = parseInt(month, 10);
        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
            throw new ApiError(400, 'year must be a number and month must be 1-12');
        }
        return { year, month };
    }

    if (periodType === 'half-yearly') {
        const cycleYear = parseInt(query.cycleYear, 10);
        const cycleNumber = parseInt(query.cycleNumber, 10);
        if (!Number.isInteger(cycleYear) || ![1, 2].includes(cycleNumber)) {
            throw new ApiError(400, 'Provide poolId, or cycleYear and cycleNumber (1 or 2)');
        }
        return { cycleYear, cycleNumber };
    }

    const cycleYear = parseInt(query.cycleYear, 10);
    if (!Number.isInteger(cycleYear)) {
        throw new ApiError(400, 'Provide poolId, or cycleYear');
    }
    return { cycleYear };
};

const round2 = (n) => parseFloat((Number(n) || 0).toFixed(2));

/**
 * GET /api/v1/admin/bonus-qualifiers
 * Lists the bonuses these endpoints cover and the period parameters each one takes.
 */
export const listBonusTypes = asyncHandler(async (req, res) => {
    const types = Object.entries(BONUS_REGISTRY).map(([key, v]) => ({
        bonusType: key,
        label: v.label,
        periodType: v.periodType,
        periodParams: v.periodType === 'monthly' ? ['year', 'month']
            : v.periodType === 'half-yearly' ? ['cycleYear', 'cycleNumber']
                : ['cycleYear']
    }));

    return res.status(200).json(
        new ApiResponse(200, { count: types.length, types }, 'Supported bonuses fetched successfully')
    );
});

/**
 * GET /api/v1/admin/bonus-qualifiers/:bonusType/pools
 * Every distribution period recorded for that bonus, newest first, so the
 * caller can pick one without already knowing a poolId.
 */
export const listBonusPools = asyncHandler(async (req, res) => {
    const { label, periodType, Pool } = resolveBonus(req.params.bonusType);

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const pools = await Pool.find({})
        .sort(sortForPeriod(periodType))
        .limit(limit)
        .lean();

    const data = pools.map(p => ({
        poolId: p._id,
        period: periodOf(periodType, p),
        periodLabel: periodLabel(periodType, p),
        companyTotalBV: p.companyTotalBV ?? 0,
        poolPercent: p.poolPercent ?? 0,
        poolAmount: p.poolAmount ?? 0,
        totalUnits: p.totalUnits ?? 0,
        perUnitValue: p.perUnitValue ?? 0,
        eligibleUserCount: p.eligibleUserCount ?? 0,
        status: p.status,
        distributedAt: p.distributedAt || null
    }));

    return res.status(200).json(
        new ApiResponse(200, {
            bonusType: req.params.bonusType.toLowerCase(),
            label,
            periodType,
            count: data.length,
            pools: data
        }, `${label} pools fetched successfully`)
    );
});

/**
 * GET /api/v1/admin/bonus-qualifiers/:bonusType/qualifiers
 *
 * Select the pool with either:
 *   ?poolId=<id>
 *   ?year=2026&month=8      (monthly bonuses; ?month=2026-08 also works)
 *   ?cycleYear=2026&cycleNumber=1   (House Fund)
 *   ?cycleYear=2026         (Royalty Fund, SSVPL Super Bonus)
 *
 * Optional: ?page=1&limit=100  ·  ?search=<memberId or name>
 *
 * Returns the members actually credited from that pool, each with the units
 * they earned and the gross/admin/TDS/net breakdown, plus a `check` block
 * comparing the pool's stored qualifier count against the rows really present.
 */
export const getBonusQualifiers = asyncHandler(async (req, res) => {
    const { label, periodType, Pool, Credit } = resolveBonus(req.params.bonusType);

    const pool = await Pool.findOne(buildPoolFilter(periodType, req.query)).lean();
    if (!pool) {
        return res.status(200).json(
            new ApiResponse(200, null, `No ${label} pool found for the requested period`)
        );
    }

    // Every credit row written against this pool — this IS the qualifier list.
    const credits = await Credit.find({ poolId: pool._id }).lean();

    const userIds = credits.map(c => c.userId).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } })
        .select('_id memberId fullName phone email status')
        .lean();
    const userMap = new Map(users.map(u => [String(u._id), u]));

    let rows = credits.map(c => {
        const u = userMap.get(String(c.userId)) || {};
        return {
            userId: c.userId,
            memberId: c.memberId || u.memberId || null,
            fullName: u.fullName || null,
            phone: u.phone || null,
            email: u.email || null,
            accountStatus: u.status || null,

            finalUnits: c.finalUnits ?? 0,
            perUnitValue: c.perUnitValue ?? 0,
            grossCredit: round2(c.grossCredit),
            adminCharge: round2(c.adminCharge),
            tds: round2(c.tds),
            netCredit: round2(c.netCredit),
            creditedAt: c.creditedAt || null
        };
    });

    // Optional search across member id and name.
    const search = (req.query.search || '').trim().toLowerCase();
    if (search) {
        rows = rows.filter(r =>
            String(r.memberId || '').toLowerCase().includes(search) ||
            String(r.fullName || '').toLowerCase().includes(search)
        );
    }

    // Biggest earner first — that is what an admin scanning the list wants.
    rows.sort((a, b) => b.netCredit - a.netCredit);

    const totals = rows.reduce((acc, r) => {
        acc.totalUnits += Number(r.finalUnits) || 0;
        acc.totalGross += r.grossCredit;
        acc.totalAdminCharge += r.adminCharge;
        acc.totalTds += r.tds;
        acc.totalNet += r.netCredit;
        return acc;
    }, { totalUnits: 0, totalGross: 0, totalAdminCharge: 0, totalTds: 0, totalNet: 0 });

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 500, 1), 2000);
    const start = (page - 1) * limit;
    const paged = rows.slice(start, start + limit);

    return res.status(200).json(
        new ApiResponse(200, {
            bonusType: req.params.bonusType.toLowerCase(),
            label,
            periodType,
            period: periodOf(periodType, pool),
            periodLabel: periodLabel(periodType, pool),

            pool: {
                poolId: pool._id,
                status: pool.status,
                companyTotalBV: pool.companyTotalBV ?? 0,
                poolPercent: pool.poolPercent ?? 0,
                poolAmount: pool.poolAmount ?? 0,
                totalUnits: pool.totalUnits ?? 0,
                perUnitValue: pool.perUnitValue ?? 0,
                eligibleUserCount: pool.eligibleUserCount ?? 0,
                adminChargePercent: pool.adminChargePercent ?? 0,
                tdsPercent: pool.tdsPercent ?? 0,
                distributedAt: pool.distributedAt || null
            },

            totals: {
                qualifierCount: rows.length,
                totalUnits: round2(totals.totalUnits),
                totalGross: round2(totals.totalGross),
                totalAdminCharge: round2(totals.totalAdminCharge),
                totalTds: round2(totals.totalTds),
                totalNet: round2(totals.totalNet)
            },

            // Surfaces a mismatch between the count shown on the pool screen and
            // the credit rows that actually exist, instead of hiding it.
            check: {
                poolEligibleUserCount: pool.eligibleUserCount ?? 0,
                creditRowsFound: credits.length,
                matches: (pool.eligibleUserCount ?? 0) === credits.length
            },

            pagination: {
                page,
                limit,
                total: rows.length,
                pages: Math.ceil(rows.length / limit) || 0
            },

            qualifiers: paged
        }, `${label} qualifiers fetched successfully`)
    );
});
