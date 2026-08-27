import { royaltyFundService } from '../../services/business/royaltyFund.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getUserRoyaltyFundStatus = asyncHandler(async (req, res) => {
    const status = await royaltyFundService.getUserStatus(req.user._id);
    return res.status(200).json(new ApiResponse(200, status, "Royalty Fund status fetched successfully"));
});

export const getUserRoyaltyFundHistory = asyncHandler(async (req, res) => {
    const history = await royaltyFundService.getUserHistory(req.user._id);
    return res.status(200).json(new ApiResponse(200, history, "Royalty Fund history fetched successfully"));
});

export const getUserLiveEstimate = asyncHandler(async (req, res) => {
    const estimate = await royaltyFundService.getUserLiveEstimate(req.user._id);
    return res.status(200).json(new ApiResponse(200, estimate, "Royalty Fund live estimate fetched successfully"));
});

export const getPublicRoyaltyFundStatus = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const User = (await import('../../models/User.model.js')).default;
    const user = await User.findOne({ memberId }).select('_id').lean();
    
    if (!user) {
        return res.status(404).json(new ApiResponse(404, null, "User not found"));
    }

    const status = await royaltyFundService.getUserStatus(user._id);
    return res.status(200).json(new ApiResponse(200, status, "Public Royalty Fund status fetched successfully"));
});
