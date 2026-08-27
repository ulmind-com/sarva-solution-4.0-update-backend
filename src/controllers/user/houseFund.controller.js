import { houseFundService } from '../../services/business/houseFund.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getUserHouseFundStatus = asyncHandler(async (req, res) => {
    const status = await houseFundService.getUserStatus(req.user._id);
    return res.status(200).json(new ApiResponse(200, status, "House Fund status fetched successfully"));
});

export const getUserHouseFundHistory = asyncHandler(async (req, res) => {
    const history = await houseFundService.getUserHistory(req.user._id);
    return res.status(200).json(new ApiResponse(200, history, "House Fund history fetched successfully"));
});

export const getUserLiveEstimate = asyncHandler(async (req, res) => {
    const estimate = await houseFundService.getUserLiveEstimate(req.user._id);
    return res.status(200).json(new ApiResponse(200, estimate, "House Fund live estimate fetched successfully"));
});

export const getPublicHouseFundStatus = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const User = (await import('../../models/User.model.js')).default;
    const user = await User.findOne({ memberId }).select('_id').lean();
    
    if (!user) {
        return res.status(404).json(new ApiResponse(404, null, "User not found"));
    }

    const status = await houseFundService.getUserStatus(user._id);
    return res.status(200).json(new ApiResponse(200, status, "Public House Fund status fetched successfully"));
});
