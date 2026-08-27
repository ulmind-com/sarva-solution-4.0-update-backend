import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { leadershipBonusService } from '../../services/business/leadershipBonus.service.js';

/** GET /api/v1/user/leadership-bonus/status */
export const getMyLBStatus = asyncHandler(async (req, res) => {
    const data = await leadershipBonusService.getUserStatus(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Leadership Bonus status fetched successfully'));
});

/** GET /api/v1/user/leadership-bonus/history */
export const getMyLBHistory = asyncHandler(async (req, res) => {
    const data = await leadershipBonusService.getUserHistory(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Leadership Bonus history fetched successfully'));
});

/** GET /api/v1/user/leadership-bonus/live-estimate */
export const getMyLBLiveEstimate = asyncHandler(async (req, res) => {
    const data = await leadershipBonusService.getUserLiveEstimate(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Leadership Bonus live estimate fetched successfully'));
});

/** GET /api/v1/user/leadership-bonus/status/:memberId  (PUBLIC) */
export const getPublicLBStatus = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const User = (await import('../../models/User.model.js')).default;
    const user = await User.findOne({ memberId }).select('_id memberId fullName status').lean();
    if (!user) throw new ApiError(404, 'Member not found');
    const data = await leadershipBonusService.getUserStatus(user._id);
    return res.status(200).json(new ApiResponse(200, {
        user: { memberId: user.memberId, fullName: user.fullName },
        ...data
    }, 'Leadership Bonus status fetched successfully'));
});
