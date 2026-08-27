import User from '../../models/User.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * @desc    Change User Password
 * @route   PUT /api/v1/user/change-password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new ApiError(400, 'Current and new password are required');
    }

    if (newPassword.length < 6) {
        throw new ApiError(400, 'Password must be at least 6 characters');
    }

    // Must select password explicitly because it defaults to select: false
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        throw new ApiError(400, 'Invalid current password');
    }

    // Set new password - will be hashed automatically by User.model pre-save hook
    user.password = newPassword;
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, {}, 'Password changed successfully')
    );
});
