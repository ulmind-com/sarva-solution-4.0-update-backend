import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { beginnerBonusService } from '../../services/business/beginnerBonus.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// USER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/user/beginner-bonus/status
 * Current month BV breakdown, carry-forward, and estimated units for logged-in user.
 */
export const getMyBBStatus = asyncHandler(async (req, res) => {
    const data = await beginnerBonusService.getUserStatus(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Beginner Bonus status fetched successfully'));
});

/**
 * GET /api/v1/user/beginner-bonus/history
 * Full payout history for logged-in user.
 */
export const getMyBBHistory = asyncHandler(async (req, res) => {
    const data = await beginnerBonusService.getUserHistory(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Beginner Bonus history fetched successfully'));
});

/**
 * GET /api/v1/user/beginner-bonus/status/:memberId   (PUBLIC)
 * Same view as getMyBBStatus but for any member by memberId.
 */
export const getPublicBBStatus = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const User = (await import('../../models/User.model.js')).default;
    const user = await User.findOne({ memberId }).select('_id memberId fullName status').lean();
    if (!user) throw new ApiError(404, 'Member not found');

    const data = await beginnerBonusService.getUserStatus(user._id);
    return res.status(200).json(new ApiResponse(200, { user: { memberId: user.memberId, fullName: user.fullName }, ...data }, 'Beginner Bonus status fetched successfully'));
});

/**
 * GET /api/v1/user/beginner-bonus/live-estimate
 * Live earning estimate for the logged-in user based on current month company BV.
 */
export const getMyLiveEstimate = asyncHandler(async (req, res) => {
    const data = await beginnerBonusService.getUserLiveEstimate(req.user._id);
    return res.status(200).json(new ApiResponse(200, data, 'Beginner Bonus live estimate fetched successfully'));
});
