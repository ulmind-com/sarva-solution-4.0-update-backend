import { ssvplSuperBonusService } from '../../services/business/ssvplSuperBonus.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';

export const getLivePool = asyncHandler(async (req, res) => {
    const pool = await ssvplSuperBonusService.getLivePool();
    return res.status(200).json(new ApiResponse(200, pool, "Live SSVPL Super Bonus pool fetched successfully"));
});

export const getPoolList = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 12;
    const result = await ssvplSuperBonusService.getAdminPoolList(page, limit);
    return res.status(200).json(new ApiResponse(200, result, "SSVPL Super Bonus pool list fetched successfully"));
});

export const getPoolDetails = asyncHandler(async (req, res) => {
    const { cycleYear } = req.params;
    const details = await ssvplSuperBonusService.getAdminPoolDetails(parseInt(cycleYear));
    if (!details) {
        throw new ApiError(404, "Pool not found for the given cycle.");
    }
    return res.status(200).json(new ApiResponse(200, details, "Pool details fetched successfully"));
});

export const getCurrentCycleOverview = asyncHandler(async (req, res) => {
    const overview = await ssvplSuperBonusService.getAdminCurrentCycleOverview();
    return res.status(200).json(new ApiResponse(200, overview, "Live users overview for SSVPL Super Bonus fetched successfully"));
});

export const getUserDetails = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const details = await ssvplSuperBonusService.getAdminUserDetails(memberId);
    if (!details) {
        throw new ApiError(404, "User not found.");
    }
    return res.status(200).json(new ApiResponse(200, details, "User SSVPL Super Bonus details fetched successfully"));
});

export const triggerDistribution = asyncHandler(async (req, res) => {
    const { cycleYear } = req.body;
    if (!cycleYear) {
        throw new ApiError(400, "cycleYear is required.");
    }
    const pool = await ssvplSuperBonusService.runCycleEndDistribution(cycleYear);
    return res.status(200).json(new ApiResponse(200, pool, "SSVPL Super Bonus distribution staged successfully."));
});

export const applyWalletCredits = asyncHandler(async (req, res) => {
    const { cycleYear } = req.body;
    if (!cycleYear) {
        throw new ApiError(400, "cycleYear is required.");
    }
    await ssvplSuperBonusService.applyWalletCredits(cycleYear);
    return res.status(200).json(new ApiResponse(200, null, "SSVPL Super Bonus wallet credits applied successfully."));
});
