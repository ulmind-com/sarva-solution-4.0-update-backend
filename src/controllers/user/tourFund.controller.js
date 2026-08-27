import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { tourFundService } from '../../services/business/tourFund.service.js';

/** GET /api/v1/user/tour-fund/status */
export const getMyTFStatus = asyncHandler(async (req, res) => {
    const data = await tourFundService.getUserStatus(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Tour Fund status fetched successfully'));
});

/** GET /api/v1/user/tour-fund/history */
export const getMyTFHistory = asyncHandler(async (req, res) => {
    const data = await tourFundService.getUserHistory(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Tour Fund history fetched successfully'));
});

/** GET /api/v1/user/tour-fund/live-estimate */
export const getMyTFLiveEstimate = asyncHandler(async (req, res) => {
    const data = await tourFundService.getUserLiveEstimate(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Tour Fund live estimate fetched successfully'));
});

/** GET /api/v1/user/tour-fund/status/:memberId  (PUBLIC) */
export const getPublicTFStatus = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const User = (await import('../../models/User.model.js')).default;
    const user = await User.findOne({ memberId }).select('_id memberId fullName status').lean();
    if (!user) throw new ApiError(404, 'Member not found');
    const data = await tourFundService.getUserStatus(user._id);
    return res.status(200).json(new ApiResponse(200, {
        user: { memberId: user.memberId, fullName: user.fullName },
        ...data
    }, 'Tour Fund status fetched successfully'));
});
