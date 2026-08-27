import { royaltyFundService } from '../../services/business/royaltyFund.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';

export const getLivePool = asyncHandler(async (req, res) => {
    const pool = await royaltyFundService.getLivePool();
    return res.status(200).json(new ApiResponse(200, pool, "Live Royalty Fund pool fetched successfully"));
});

export const getPoolList = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 12;
    const result = await royaltyFundService.getAdminPoolList(page, limit);
    return res.status(200).json(new ApiResponse(200, result, "Royalty Fund pool list fetched successfully"));
});

export const getPoolDetails = asyncHandler(async (req, res) => {
    const { cycleYear } = req.params;
    const details = await royaltyFundService.getAdminPoolDetails(parseInt(cycleYear));
    if (!details) {
        throw new ApiError(404, "Pool not found for the given cycle.");
    }
    return res.status(200).json(new ApiResponse(200, details, "Pool details fetched successfully"));
});

export const getCurrentCycleOverview = asyncHandler(async (req, res) => {
    const overview = await royaltyFundService.getAdminCurrentCycleOverview();
    return res.status(200).json(new ApiResponse(200, overview, "Live users overview for Royalty Fund fetched successfully"));
});

export const getUserDetails = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const details = await royaltyFundService.getAdminUserDetails(memberId);
    if (!details) {
        throw new ApiError(404, "User not found.");
    }
    return res.status(200).json(new ApiResponse(200, details, "User Royalty Fund details fetched successfully"));
});

export const triggerDistribution = asyncHandler(async (req, res) => {
    const { cycleYear } = req.body;
    if (!cycleYear) {
        throw new ApiError(400, "cycleYear is required.");
    }
    const pool = await royaltyFundService.runCycleEndDistribution(cycleYear);
    return res.status(200).json(new ApiResponse(200, pool, "Royalty Fund distribution staged successfully."));
});

export const applyWalletCredits = asyncHandler(async (req, res) => {
    const { cycleYear } = req.body;
    if (!cycleYear) {
        throw new ApiError(400, "cycleYear is required.");
    }
    await royaltyFundService.applyWalletCredits(cycleYear);
    return res.status(200).json(new ApiResponse(200, null, "Royalty Fund wallet credits applied successfully."));
});
