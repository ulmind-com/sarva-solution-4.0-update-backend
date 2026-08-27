import { houseFundService } from '../../services/business/houseFund.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';

export const getLivePool = asyncHandler(async (req, res) => {
    const pool = await houseFundService.getLivePool();
    return res.status(200).json(new ApiResponse(200, pool, "Live House Fund pool fetched successfully"));
});

export const getPoolList = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 12;
    const result = await houseFundService.getAdminPoolList(page, limit);
    return res.status(200).json(new ApiResponse(200, result, "House Fund pool list fetched successfully"));
});

export const getPoolDetails = asyncHandler(async (req, res) => {
    const { cycleYear, cycleNumber } = req.params;
    const details = await houseFundService.getAdminPoolDetails(parseInt(cycleYear), parseInt(cycleNumber));
    if (!details) {
        throw new ApiError(404, "Pool not found for the given cycle.");
    }
    return res.status(200).json(new ApiResponse(200, details, "Pool details fetched successfully"));
});

export const getCurrentCycleOverview = asyncHandler(async (req, res) => {
    const overview = await houseFundService.getAdminCurrentCycleOverview();
    return res.status(200).json(new ApiResponse(200, overview, "Live users overview for House Fund fetched successfully"));
});

export const getUserDetails = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const details = await houseFundService.getAdminUserDetails(memberId);
    if (!details) {
        throw new ApiError(404, "User not found.");
    }
    return res.status(200).json(new ApiResponse(200, details, "User House Fund details fetched successfully"));
});

export const triggerDistribution = asyncHandler(async (req, res) => {
    const { cycleYear, cycleNumber } = req.body;
    if (!cycleYear || !cycleNumber) {
        throw new ApiError(400, "cycleYear and cycleNumber are required.");
    }
    const pool = await houseFundService.runCycleEndDistribution(cycleYear, cycleNumber);
    return res.status(200).json(new ApiResponse(200, pool, "House Fund distribution staged successfully."));
});

export const applyWalletCredits = asyncHandler(async (req, res) => {
    const { cycleYear, cycleNumber } = req.body;
    if (!cycleYear || !cycleNumber) {
        throw new ApiError(400, "cycleYear and cycleNumber are required.");
    }
    await houseFundService.applyWalletCredits(cycleYear, cycleNumber);
    return res.status(200).json(new ApiResponse(200, null, "House Fund wallet credits applied successfully."));
});
