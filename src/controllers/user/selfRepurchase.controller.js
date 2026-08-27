import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { selfRepurchaseService } from '../../services/business/selfRepurchase.service.js';
import moment from 'moment-timezone';

// ────────────────────────────────────────────────────────────────────
// USER ENDPOINTS
// ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/user/self-repurchase-bonus/status
 * Returns the authenticated user's SRB eligibility status for the current
 * month and their last month's bonus receipt.
 */
export const getUserSRBStatus = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const data = await selfRepurchaseService.getUserSRBStatus(userId);

    return res.status(200).json(
        new ApiResponse(200, data, 'Self Repurchase Bonus status fetched successfully')
    );
});

/**
 * GET /api/v1/user/self-repurchase-bonus/personal-bv
 * Returns the authenticated user's personal total BV generated from repurchases.
 * Shows lifetime total, current month total, and a history of actual entries.
 */
export const getUserPersonalRepurchaseBV = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const now = moment().tz('Asia/Kolkata');
    const currentMonth = now.month() + 1;
    const currentYear = now.year();

    const SelfRepurchaseBVEntry = (await import('../../models/SelfRepurchaseBVEntry.model.js')).default;

    const entries = await SelfRepurchaseBVEntry.find({ userId })
        .sort({ purchaseDate: -1 })
        .lean();

    let lifetimeTotal = 0;
    let currentMonthTotal = 0;

    entries.forEach(entry => {
        lifetimeTotal += entry.bvAmount;
        if (entry.month === currentMonth && entry.year === currentYear) {
            currentMonthTotal += entry.bvAmount;
        }
    });

    return res.status(200).json(
        new ApiResponse(200, lifetimeTotal, 'Personal Repurchase BV fetched successfully')
    );
});

// ────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS

// ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/self-repurchase-bonus/company-bv?month=YYYY-MM
 * Returns the company-wide total BV for the specified month.
 * Query param: month = "2026-03"  (YYYY-MM format)
 */
export const getCompanyBV = asyncHandler(async (req, res) => {
    const { month } = req.query;

    let year, monthNum;

    if (month) {
        const parsed = moment(month, 'YYYY-MM', true);
        if (!parsed.isValid()) {
            throw new ApiError(400, 'Invalid month format. Use YYYY-MM (e.g. 2026-03)');
        }
        year = parsed.year();
        monthNum = parsed.month() + 1;
    } else {
        // Default to current month
        const now = moment().tz('Asia/Kolkata');
        year = now.year();
        monthNum = now.month() + 1;
    }

    const data = await selfRepurchaseService.getCompanyBVForMonth(year, monthNum);

    return res.status(200).json(
        new ApiResponse(200, data, `Company BV for ${year}-${String(monthNum).padStart(2, '0')} fetched successfully`)
    );
});

/**
 * GET /api/v1/admin/self-repurchase-bonus/distribution?month=YYYY-MM
 * Returns the pool document and per-user credit list for a given month.
 */
export const getDistributionDetails = asyncHandler(async (req, res) => {
    const { month } = req.query;

    let year, monthNum;

    if (month) {
        const parsed = moment(month, 'YYYY-MM', true);
        if (!parsed.isValid()) {
            throw new ApiError(400, 'Invalid month format. Use YYYY-MM (e.g. 2026-03)');
        }
        year = parsed.year();
        monthNum = parsed.month() + 1;
    } else {
        const now = moment().tz('Asia/Kolkata');
        year = now.year();
        monthNum = now.month() + 1;
    }

    const data = await selfRepurchaseService.getDistributionDetails(year, monthNum);

    if (!data) {
        return res.status(200).json(
            new ApiResponse(200, null, `No distribution record found for ${year}-${String(monthNum).padStart(2, '0')}`)
        );
    }

    return res.status(200).json(
        new ApiResponse(200, data, 'Distribution details fetched successfully')
    );
});

/**
 * POST /api/v1/admin/self-repurchase-bonus/trigger-distribution
 * Manually triggers the month-end distribution (idempotent — safe to retry).
 * Body: { year: 2026, month: 3 }
 */
export const triggerDistribution = asyncHandler(async (req, res) => {
    let { year, month } = req.body;

    if (!year || !month) {
        // Default to previous month if not provided
        const prev = moment().tz('Asia/Kolkata').subtract(1, 'month');
        year = year || prev.year();
        month = month || (prev.month() + 1);
    }

    year = parseInt(year);
    month = parseInt(month);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        throw new ApiError(400, 'Invalid year or month. month must be 1–12.');
    }

    const result = await selfRepurchaseService.runMonthEndDistribution(year, month);

    return res.status(200).json(
        new ApiResponse(200, result, `SRB distribution for ${year}-${String(month).padStart(2, '0')} — status: ${result.status}`)
    );
});

/**
 * GET /api/v1/admin/self-repurchase-bonus/live-pool
 * Current month: who is eligible right now, with their full name, BV, and projected bonus.
 */
export const getLivePool = asyncHandler(async (req, res) => {
    const data = await selfRepurchaseService.getLivePool();

    return res.status(200).json(
        new ApiResponse(200, data, 'Live pool data fetched successfully')
    );
});

/**
 * GET /api/v1/admin/self-repurchase-bonus/eligible-users?month=YYYY-MM
 * Month-wise eligible user list with actual (post-distribution) or projected earnings.
 */
export const getEligibleUsersHistory = asyncHandler(async (req, res) => {
    const { month } = req.query;

    let year, monthNum;

    if (month) {
        const parsed = moment(month, 'YYYY-MM', true);
        if (!parsed.isValid()) {
            throw new ApiError(400, 'Invalid month format. Use YYYY-MM (e.g. 2026-03)');
        }
        year = parsed.year();
        monthNum = parsed.month() + 1;
    } else {
        const now = moment().tz('Asia/Kolkata');
        year = now.year();
        monthNum = now.month() + 1;
    }

    const data = await selfRepurchaseService.getEligibleUsersHistory(year, monthNum);

    return res.status(200).json(
        new ApiResponse(200, data, `Eligible users for ${year}-${String(monthNum).padStart(2, '0')} fetched successfully`)
    );
});

/**
 * GET /api/v1/admin/self-repurchase-bonus/bv-history
 * Company BV history — all months, sorted newest first.
 */
export const getCompanyBVHistory = asyncHandler(async (req, res) => {
    const data = await selfRepurchaseService.getCompanyBVHistory();

    return res.status(200).json(
        new ApiResponse(200, data, 'Company BV history fetched successfully')
    );
});
