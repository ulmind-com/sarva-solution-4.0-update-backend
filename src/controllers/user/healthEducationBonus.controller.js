import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { healthEducationBonusService } from '../../services/business/healthEducationBonus.service.js';

/** GET /api/v1/user/health-education-bonus/status */
export const getMyHEBStatus = asyncHandler(async (req, res) => {
    const data = await healthEducationBonusService.getUserStatus(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Health & Education Bonus status fetched successfully'));
});

/** GET /api/v1/user/health-education-bonus/history */
export const getMyHEBHistory = asyncHandler(async (req, res) => {
    const data = await healthEducationBonusService.getUserHistory(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Health & Education Bonus history fetched successfully'));
});

/** GET /api/v1/user/health-education-bonus/live-estimate */
export const getMyHEBLiveEstimate = asyncHandler(async (req, res) => {
    const data = await healthEducationBonusService.getUserLiveEstimate(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Health & Education Bonus live estimate fetched successfully'));
});

/** GET /api/v1/user/health-education-bonus/status/:memberId  (PUBLIC) */
export const getPublicHEBStatus = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const User = (await import('../../models/User.model.js')).default;
    const user = await User.findOne({ memberId }).select('_id memberId fullName status').lean();
    if (!user) throw new ApiError(404, 'Member not found');
    const data = await healthEducationBonusService.getUserStatus(user._id);
    return res.status(200).json(new ApiResponse(200, {
        user: { memberId: user.memberId, fullName: user.fullName },
        ...data
    }, 'Health & Education Bonus status fetched successfully'));
});
