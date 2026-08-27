import User from '../../models/User.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * Get User Name by Member ID (Public)
 */
export const getUserName = asyncHandler(async (req, res) => {
    const { memberId } = req.params;

    if (!memberId) throw new ApiError(400, 'Member ID is required');

    const user = await User.findOne({ memberId }).select('fullName memberId');

    if (!user) throw new ApiError(404, 'User not found');

    return res.status(200).json(
        new ApiResponse(200, { fullName: user.fullName, memberId: user.memberId }, 'User name fetched successfully')
    );
});
