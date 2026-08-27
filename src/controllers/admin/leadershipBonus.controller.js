import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { leadershipBonusService } from '../../services/business/leadershipBonus.service.js';

/** GET /api/v1/admin/leadership-bonus/pools */
export const listLBPools = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page  || '1', 10);
    const limit = parseInt(req.query.limit || '12', 10);
    const data  = await leadershipBonusService.getAdminPoolList(page, limit);
    return res.status(200).json(new ApiResponse(200, data, 'Leadership Bonus pool list fetched'));
});

/** GET /api/v1/admin/leadership-bonus/pools/:year/:month */
export const getLBPoolDetail = asyncHandler(async (req, res) => {
    const year  = parseInt(req.params.year,  10);
    const month = parseInt(req.params.month, 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12)
        throw new ApiError(400, 'Invalid year or month parameter');
    const data = await leadershipBonusService.getAdminPoolDetails(year, month);
    if (!data) throw new ApiError(404, `No Leadership Bonus pool found for ${year}-${month}`);
    return res.status(200).json(new ApiResponse(200, data, 'Leadership Bonus pool detail fetched'));
});

/** GET /api/v1/admin/leadership-bonus/users */
export const listAllUsersLB = asyncHandler(async (req, res) => {
    const data = await leadershipBonusService.getAdminCurrentMonthOverview();
    return res.status(200).json(new ApiResponse(200, data, 'Current month Leadership Bonus overview fetched'));
});

/** GET /api/v1/admin/leadership-bonus/users/:memberId */
export const getAdminUserLBDetails = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const data = await leadershipBonusService.getAdminUserDetails(memberId);
    if (!data) throw new ApiError(404, 'Member not found');
    return res.status(200).json(new ApiResponse(200, data, 'User Leadership Bonus detail fetched'));
});

/** GET /api/v1/admin/leadership-bonus/live-pool */
export const getLiveLBPool = asyncHandler(async (req, res) => {
    const data = await leadershipBonusService.getLivePool();
    return res.status(200).json(new ApiResponse(200, data, 'Leadership Bonus live pool fetched successfully'));
});

/** POST /api/v1/admin/leadership-bonus/trigger */
export const triggerLBDistribution = asyncHandler(async (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) throw new ApiError(400, 'year and month are required');
    const y = parseInt(year, 10), m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) throw new ApiError(400, 'Invalid year or month');
    const pool = await leadershipBonusService.runMonthEndDistribution(y, m);
    return res.status(200).json(new ApiResponse(200, pool, `Leadership Bonus distribution staged for ${y}-${m}`));
});

/** POST /api/v1/admin/leadership-bonus/apply-credits */
export const applyLBWalletCredits = asyncHandler(async (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) throw new ApiError(400, 'year and month are required');
    const y = parseInt(year, 10), m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) throw new ApiError(400, 'Invalid year or month');
    await leadershipBonusService.applyWalletCredits(y, m);
    return res.status(200).json(new ApiResponse(200, null, `Leadership Bonus wallet credits applied for ${y}-${m}`));
});
