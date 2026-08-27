import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { bikeCarFundService } from '../../services/business/bikeCarFund.service.js';

/** GET /api/v1/admin/bike-car-fund/pools */
export const listBCFPools = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page  || '1', 10);
    const limit = parseInt(req.query.limit || '12', 10);
    const data  = await bikeCarFundService.getAdminPoolList(page, limit);
    return res.status(200).json(new ApiResponse(200, data, 'Bike & Car Fund pool list fetched'));
});

/** GET /api/v1/admin/bike-car-fund/pools/:year/:month */
export const getBCFPoolDetail = asyncHandler(async (req, res) => {
    const year  = parseInt(req.params.year,  10);
    const month = parseInt(req.params.month, 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12)
        throw new ApiError(400, 'Invalid year or month parameter');
    const data = await bikeCarFundService.getAdminPoolDetails(year, month);
    if (!data) throw new ApiError(404, `No Bike & Car Fund pool found for ${year}-${month}`);
    return res.status(200).json(new ApiResponse(200, data, 'Bike & Car Fund pool detail fetched'));
});

/** GET /api/v1/admin/bike-car-fund/users */
export const listAllUsersBCF = asyncHandler(async (req, res) => {
    const data = await bikeCarFundService.getAdminCurrentMonthOverview();
    return res.status(200).json(new ApiResponse(200, data, 'Current month Bike & Car Fund overview fetched'));
});

/** GET /api/v1/admin/bike-car-fund/users/:memberId */
export const getAdminUserBCFDetails = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const data = await bikeCarFundService.getAdminUserDetails(memberId);
    if (!data) throw new ApiError(404, 'Member not found');
    return res.status(200).json(new ApiResponse(200, data, 'User Bike & Car Fund detail fetched'));
});

/** GET /api/v1/admin/bike-car-fund/live-pool */
export const getLiveBCFPool = asyncHandler(async (req, res) => {
    const data = await bikeCarFundService.getLivePool();
    return res.status(200).json(new ApiResponse(200, data, 'Bike & Car Fund live pool fetched successfully'));
});

/** POST /api/v1/admin/bike-car-fund/trigger */
export const triggerBCFDistribution = asyncHandler(async (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) throw new ApiError(400, 'year and month are required');
    const y = parseInt(year, 10), m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) throw new ApiError(400, 'Invalid year or month');
    const pool = await bikeCarFundService.runMonthEndDistribution(y, m);
    return res.status(200).json(new ApiResponse(200, pool, `Bike & Car Fund distribution staged for ${y}-${m}`));
});

/** POST /api/v1/admin/bike-car-fund/apply-credits */
export const applyBCFWalletCredits = asyncHandler(async (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) throw new ApiError(400, 'year and month are required');
    const y = parseInt(year, 10), m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) throw new ApiError(400, 'Invalid year or month');
    await bikeCarFundService.applyWalletCredits(y, m);
    return res.status(200).json(new ApiResponse(200, null, `Bike & Car Fund wallet credits applied for ${y}-${m}`));
});
