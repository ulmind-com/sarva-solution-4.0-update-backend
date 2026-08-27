import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { startUpBonusService } from '../../services/business/startUpBonus.service.js';

/**
 * GET /api/v1/admin/startup-bonus/pools
 * Paginated list of all monthly pool records.
 */
export const listSubPools = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page  || '1', 10);
    const limit = parseInt(req.query.limit || '12', 10);
    const data  = await startUpBonusService.getAdminPoolList(page, limit);
    return res.status(200).json(new ApiResponse(200, data, 'Start Up Bonus pool list fetched'));
});

/**
 * GET /api/v1/admin/startup-bonus/pools/:year/:month
 * Full pool detail including all user credits.
 */
export const getSubPoolDetail = asyncHandler(async (req, res) => {
    const year  = parseInt(req.params.year,  10);
    const month = parseInt(req.params.month, 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        throw new ApiError(400, 'Invalid year or month parameter');
    }
    const data = await startUpBonusService.getAdminPoolDetails(year, month);
    if (!data) throw new ApiError(404, `No Start Up Bonus pool found for ${year}-${month}`);
    return res.status(200).json(new ApiResponse(200, data, 'Start Up Bonus pool detail fetched'));
});

/**
 * GET /api/v1/admin/startup-bonus/users
 * All active users with current-month unit estimates.
 */
export const listAllUsersSubBonus = asyncHandler(async (req, res) => {
    const data = await startUpBonusService.getAdminCurrentMonthOverview();
    return res.status(200).json(new ApiResponse(200, data, 'Current month Start Up Bonus overview fetched'));
});

/**
 * GET /api/v1/admin/startup-bonus/users/:memberId
 * Full history + current-month state for one user.
 */
export const getAdminUserSubDetails = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const data = await startUpBonusService.getAdminUserDetails(memberId);
    if (!data) throw new ApiError(404, 'Member not found');
    return res.status(200).json(new ApiResponse(200, data, 'User Start Up Bonus detail fetched'));
});

/**
 * GET /api/v1/admin/startup-bonus/live-pool
 * Real-time pool preview — company BV, per-unit value, all user estimates.
 */
export const getLiveSubPool = asyncHandler(async (req, res) => {
    const data = await startUpBonusService.getLivePool();
    return res.status(200).json(new ApiResponse(200, data, 'Start Up Bonus live pool fetched successfully'));
});

/**
 * POST /api/v1/admin/startup-bonus/trigger
 * Manually trigger month-end distribution. Body: { year, month }
 */
export const triggerSubDistribution = asyncHandler(async (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) throw new ApiError(400, 'year and month are required');
    const y = parseInt(year,  10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) throw new ApiError(400, 'Invalid year or month');
    const pool = await startUpBonusService.runMonthEndDistribution(y, m);
    return res.status(200).json(new ApiResponse(200, pool, `Start Up Bonus distribution staged for ${y}-${m}`));
});

/**
 * POST /api/v1/admin/startup-bonus/apply-credits
 * Manually apply wallet credits. Body: { year, month }
 */
export const applySubWalletCredits = asyncHandler(async (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) throw new ApiError(400, 'year and month are required');
    const y = parseInt(year,  10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) throw new ApiError(400, 'Invalid year or month');
    await startUpBonusService.applyWalletCredits(y, m);
    return res.status(200).json(new ApiResponse(200, null, `Start Up Bonus wallet credits applied for ${y}-${m}`));
});
