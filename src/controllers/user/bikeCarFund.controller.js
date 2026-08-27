import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { bikeCarFundService } from '../../services/business/bikeCarFund.service.js';

/** GET /api/v1/user/bike-car-fund/status */
export const getMyBCFStatus = asyncHandler(async (req, res) => {
    const data = await bikeCarFundService.getUserStatus(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Bike & Car Fund status fetched successfully'));
});

/** GET /api/v1/user/bike-car-fund/history */
export const getMyBCFHistory = asyncHandler(async (req, res) => {
    const data = await bikeCarFundService.getUserHistory(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Bike & Car Fund history fetched successfully'));
});

/** GET /api/v1/user/bike-car-fund/live-estimate */
export const getMyBCFLiveEstimate = asyncHandler(async (req, res) => {
    const data = await bikeCarFundService.getUserLiveEstimate(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Bike & Car Fund live estimate fetched successfully'));
});

/** GET /api/v1/user/bike-car-fund/status/:memberId  (PUBLIC) */
export const getPublicBCFStatus = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const User = (await import('../../models/User.model.js')).default;
    const user = await User.findOne({ memberId }).select('_id memberId fullName status').lean();
    if (!user) throw new ApiError(404, 'Member not found');
    const data = await bikeCarFundService.getUserStatus(user._id);
    return res.status(200).json(new ApiResponse(200, {
        user: { memberId: user.memberId, fullName: user.fullName },
        ...data
    }, 'Bike & Car Fund status fetched successfully'));
});
