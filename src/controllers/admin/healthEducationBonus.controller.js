import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { healthEducationBonusService } from '../../services/business/healthEducationBonus.service.js';

/** GET /api/v1/admin/health-education-bonus/pools */
export const listHEBPools = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page  || '1', 10);
    const limit = parseInt(req.query.limit || '12', 10);
    const data  = await healthEducationBonusService.getAdminPoolList(page, limit);
    return res.status(200).json(new ApiResponse(200, data, 'Health & Education Bonus pool list fetched'));
});

/** GET /api/v1/admin/health-education-bonus/pools/:year/:month */
export const getHEBPoolDetail = asyncHandler(async (req, res) => {
    const year  = parseInt(req.params.year,  10);
    const month = parseInt(req.params.month, 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12)
        throw new ApiError(400, 'Invalid year or month parameter');
    const data = await healthEducationBonusService.getAdminPoolDetails(year, month);
    if (!data) throw new ApiError(404, `No Health & Education Bonus pool found for ${year}-${month}`);
    return res.status(200).json(new ApiResponse(200, data, 'Health & Education Bonus pool detail fetched'));
});

/** GET /api/v1/admin/health-education-bonus/users */
export const listAllUsersHEB = asyncHandler(async (req, res) => {
    const data = await healthEducationBonusService.getAdminCurrentMonthOverview();
    return res.status(200).json(new ApiResponse(200, data, 'Current month Health & Education Bonus overview fetched'));
});

/** GET /api/v1/admin/health-education-bonus/users/:memberId */
export const getAdminUserHEBDetails = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const data = await healthEducationBonusService.getAdminUserDetails(memberId);
    if (!data) throw new ApiError(404, 'Member not found');
    return res.status(200).json(new ApiResponse(200, data, 'User Health & Education Bonus detail fetched'));
});

/** GET /api/v1/admin/health-education-bonus/live-pool */
export const getLiveHEBPool = asyncHandler(async (req, res) => {
    const data = await healthEducationBonusService.getLivePool();
    return res.status(200).json(new ApiResponse(200, data, 'Health & Education Bonus live pool fetched successfully'));
});

/** POST /api/v1/admin/health-education-bonus/trigger */
export const triggerHEBDistribution = asyncHandler(async (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) throw new ApiError(400, 'year and month are required');
    const y = parseInt(year, 10), m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) throw new ApiError(400, 'Invalid year or month');
    const pool = await healthEducationBonusService.runMonthEndDistribution(y, m);
    return res.status(200).json(new ApiResponse(200, pool, `Health & Education Bonus distribution staged for ${y}-${m}`));
});

/** POST /api/v1/admin/health-education-bonus/apply-credits */
export const applyHEBWalletCredits = asyncHandler(async (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) throw new ApiError(400, 'year and month are required');
    const y = parseInt(year, 10), m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) throw new ApiError(400, 'Invalid year or month');
    await healthEducationBonusService.applyWalletCredits(y, m);
    return res.status(200).json(new ApiResponse(200, null, `Health & Education Bonus wallet credits applied for ${y}-${m}`));
});
