import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { beginnerBonusService } from '../../services/business/beginnerBonus.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/beginner-bonus/pools
 * Paginated list of all monthly pool records.
 */
export const listBBPools = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page  || '1', 10);
    const limit = parseInt(req.query.limit || '12', 10);
    const data  = await beginnerBonusService.getAdminPoolList(page, limit);
    return res.status(200).json(new ApiResponse(200, data, 'Beginner Bonus pool list fetched'));
});

/**
 * GET /api/v1/admin/beginner-bonus/pools/:year/:month
 * Full pool detail including all user credits.
 */
export const getBBPoolDetail = asyncHandler(async (req, res) => {
    const year  = parseInt(req.params.year,  10);
    const month = parseInt(req.params.month, 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        throw new ApiError(400, 'Invalid year or month parameter');
    }
    const data = await beginnerBonusService.getAdminPoolDetails(year, month);
    if (!data) throw new ApiError(404, `No Beginner Bonus pool found for ${year}-${month}`);
    return res.status(200).json(new ApiResponse(200, data, 'Beginner Bonus pool detail fetched'));
});

/**
 * GET /api/v1/admin/beginner-bonus/users/:memberId
 * Full history and current-month status for a specific user.
 */
export const getAdminUserBBDetails = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const data = await beginnerBonusService.getAdminUserDetails(memberId);
    if (!data) throw new ApiError(404, 'Member not found');
    return res.status(200).json(new ApiResponse(200, data, 'User Beginner Bonus detail fetched'));
});

/**
 * GET /api/v1/admin/beginner-bonus/users
 * All active users with their current-month estimated units.
 */
export const listAllUsersBB = asyncHandler(async (req, res) => {
    const data = await beginnerBonusService.getAdminCurrentMonthOverview();
    return res.status(200).json(new ApiResponse(200, data, 'Current month Beginner Bonus overview fetched'));
});

/**
 * POST /api/v1/admin/beginner-bonus/trigger
 * Manually trigger month-end distribution for a given year/month.
 * Body: { year, month }
 */
export const triggerBBDistribution = asyncHandler(async (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) throw new ApiError(400, 'year and month are required in the request body');

    const y = parseInt(year,  10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) throw new ApiError(400, 'Invalid year or month');

    const pool = await beginnerBonusService.runMonthEndDistribution(y, m);
    return res.status(200).json(new ApiResponse(200, pool, `Beginner Bonus distribution staged for ${y}-${m}`));
});

/**
 * POST /api/v1/admin/beginner-bonus/apply-credits
 * Manually apply wallet credits for a given year/month (1st-of-month trigger).
 * Body: { year, month }
 */
export const applyBBWalletCredits = asyncHandler(async (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) throw new ApiError(400, 'year and month are required in the request body');

    const y = parseInt(year,  10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) throw new ApiError(400, 'Invalid year or month');

    await beginnerBonusService.applyWalletCredits(y, m);
    return res.status(200).json(new ApiResponse(200, null, `Beginner Bonus wallet credits applied for ${y}-${m}`));
});

/**
 * GET /api/v1/admin/beginner-bonus/live-pool
 * Real-time pool preview: company BV, pool amount, per-unit value, and every eligible
 * user's estimated gross + net earning — no DB writes at all.
 */
export const getLiveBBPool = asyncHandler(async (req, res) => {
    const data = await beginnerBonusService.getLivePool();
    return res.status(200).json(new ApiResponse(200, data, 'Beginner Bonus live pool fetched successfully'));
});
