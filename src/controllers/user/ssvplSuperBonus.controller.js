import { ssvplSuperBonusService } from '../../services/business/ssvplSuperBonus.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getUserSsvplSuperBonusStatus = asyncHandler(async (req, res) => {
    const status = await ssvplSuperBonusService.getUserStatus(req.user._id);
    return res.status(200).json(new ApiResponse(200, status, "SSVPL Super Bonus status fetched successfully"));
});

export const getUserSsvplSuperBonusHistory = asyncHandler(async (req, res) => {
    const history = await ssvplSuperBonusService.getUserHistory(req.user._id);
    return res.status(200).json(new ApiResponse(200, history, "SSVPL Super Bonus history fetched successfully"));
});

export const getUserLiveEstimate = asyncHandler(async (req, res) => {
    const estimate = await ssvplSuperBonusService.getUserLiveEstimate(req.user._id);
    return res.status(200).json(new ApiResponse(200, estimate, "SSVPL Super Bonus live estimate fetched successfully"));
});

export const getPublicSsvplSuperBonusStatus = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const User = (await import('../../models/User.model.js')).default;
    const user = await User.findOne({ memberId }).select('_id').lean();
    
    if (!user) {
        return res.status(404).json(new ApiResponse(404, null, "User not found"));
    }

    const status = await ssvplSuperBonusService.getUserStatus(user._id);
    return res.status(200).json(new ApiResponse(200, status, "Public SSVPL Super Bonus status fetched successfully"));
});
