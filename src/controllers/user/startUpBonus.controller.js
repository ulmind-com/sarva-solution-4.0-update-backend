import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { startUpBonusService } from '../../services/business/startUpBonus.service.js';

/**
 * GET /api/v1/user/startup-bonus/status
 * Current month BV breakdown + estimated units for logged-in user.
 */
export const getMySubStatus = asyncHandler(async (req, res) => {
    const data = await startUpBonusService.getUserStatus(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Start Up Bonus status fetched successfully'));
});

/**
 * GET /api/v1/user/startup-bonus/history
 * Full payout history for logged-in user.
 */
export const getMySubHistory = asyncHandler(async (req, res) => {
    const data = await startUpBonusService.getUserHistory(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Start Up Bonus history fetched successfully'));
});

/**
 * GET /api/v1/user/startup-bonus/live-estimate
 * Real-time earning estimate for logged-in user.
 */
export const getMySubLiveEstimate = asyncHandler(async (req, res) => {
    const data = await startUpBonusService.getUserLiveEstimate(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Start Up Bonus live estimate fetched successfully'));
});

/**
 * GET /api/v1/user/startup-bonus/status/:memberId   (PUBLIC)
 * Same view for any member by memberId — no auth required.
 */
export const getPublicSubStatus = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const User = (await import('../../models/User.model.js')).default;
    const user = await User.findOne({ memberId }).select('_id memberId fullName status').lean();
    if (!user) throw new ApiError(404, 'Member not found');

    const data = await startUpBonusService.getUserStatus(user._id);
    return res.status(200).json(new ApiResponse(200, {
        user: { memberId: user.memberId, fullName: user.fullName },
        ...data
    }, 'Start Up Bonus status fetched successfully'));
});
