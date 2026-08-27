import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { tourFundService } from '../../services/business/tourFund.service.js';

/** GET /api/v1/admin/tour-fund/pools */
export const listTFPools = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page  || '1', 10);
    const limit = parseInt(req.query.limit || '12', 10);
    const data  = await tourFundService.getAdminPoolList(page, limit);
    return res.status(200).json(new ApiResponse(200, data, 'Tour Fund pool list fetched'));
});

/** GET /api/v1/admin/tour-fund/pools/:year/:month */
export const getTFPoolDetail = asyncHandler(async (req, res) => {
    const year  = parseInt(req.params.year,  10);
    const month = parseInt(req.params.month, 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12)
        throw new ApiError(400, 'Invalid year or month parameter');
    const data = await tourFundService.getAdminPoolDetails(year, month);
    if (!data) throw new ApiError(404, `No Tour Fund pool found for ${year}-${month}`);
    return res.status(200).json(new ApiResponse(200, data, 'Tour Fund pool detail fetched'));
});

/** GET /api/v1/admin/tour-fund/users */
export const listAllUsersTF = asyncHandler(async (req, res) => {
    const data = await tourFundService.getAdminCurrentMonthOverview();
    return res.status(200).json(new ApiResponse(200, data, 'Current month Tour Fund overview fetched'));
});

/** GET /api/v1/admin/tour-fund/users/:memberId */
export const getAdminUserTFDetails = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const data = await tourFundService.getAdminUserDetails(memberId);
    if (!data) throw new ApiError(404, 'Member not found');
    return res.status(200).json(new ApiResponse(200, data, 'User Tour Fund detail fetched'));
});

/** GET /api/v1/admin/tour-fund/live-pool */
export const getLiveTFPool = asyncHandler(async (req, res) => {
    const data = await tourFundService.getLivePool();
    return res.status(200).json(new ApiResponse(200, data, 'Tour Fund live pool fetched successfully'));
});

/** POST /api/v1/admin/tour-fund/trigger */
export const triggerTFDistribution = asyncHandler(async (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) throw new ApiError(400, 'year and month are required');
    const y = parseInt(year, 10), m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) throw new ApiError(400, 'Invalid year or month');
    const pool = await tourFundService.runMonthEndDistribution(y, m);
    return res.status(200).json(new ApiResponse(200, pool, `Tour Fund distribution staged for ${y}-${m}`));
});

/** POST /api/v1/admin/tour-fund/apply-credits */
export const applyTFWalletCredits = asyncHandler(async (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) throw new ApiError(400, 'year and month are required');
    const y = parseInt(year, 10), m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) throw new ApiError(400, 'Invalid year or month');
    await tourFundService.applyWalletCredits(y, m);
    return res.status(200).json(new ApiResponse(200, null, `Tour Fund wallet credits applied for ${y}-${m}`));
});
