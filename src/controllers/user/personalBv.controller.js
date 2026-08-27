import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * ISOLATED FEATURE: Personal BV Summary (Current Month / Half-Yearly / Annual).
 *
 * These endpoints are self-contained and do NOT modify any existing BV / tree
 * pipeline. They mirror the Tree BV Summary endpoints so the frontend can render
 * a Personal BV card right next to the Tree BV Summary card.
 */

/**
 * Get Personal BV Summary for the authenticated user.
 * GET /api/v1/user/personal-bv-summary
 */
export const getMyPersonalBVSummary = asyncHandler(async (req, res) => {
    const { personalBvService } = await import('../../services/business/personalBv.service.js');

    const summary = await personalBvService.getPersonalBVSummary(req.user._id);

    return res.status(200).json(
        new ApiResponse(200, summary, 'Personal BV Summary fetched successfully')
    );
});

/**
 * Get Personal BV Summary for ANY user via memberId (Public Route — mirrors
 * getPublicTreeBVSummary so drilling into a downline node works the same way).
 * GET /api/v1/user/personal-bv-summary/:memberId
 */
export const getPublicPersonalBVSummary = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const User = (await import('../../models/User.model.js')).default;
    const targetUser = await User.findOne({ memberId }).select('_id');

    if (!targetUser) {
        throw new ApiError(404, 'User not found');
    }

    const { personalBvService } = await import('../../services/business/personalBv.service.js');
    const summary = await personalBvService.getPersonalBVSummary(targetUser._id);

    return res.status(200).json(
        new ApiResponse(200, summary, 'Public Personal BV Summary fetched successfully')
    );
});

/**
 * Get Personal BV Summary for a specific user (Admin).
 * GET /api/v1/admin/personal-bv-summary/:memberId
 */
export const getAdminPersonalBVSummary = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const User = (await import('../../models/User.model.js')).default;
    const targetUser = await User.findOne({ memberId }).select('_id');

    if (!targetUser) {
        throw new ApiError(404, 'User not found');
    }

    const { personalBvService } = await import('../../services/business/personalBv.service.js');
    const summary = await personalBvService.getPersonalBVSummary(targetUser._id);

    return res.status(200).json(
        new ApiResponse(200, summary, 'Personal BV Summary fetched successfully')
    );
});
