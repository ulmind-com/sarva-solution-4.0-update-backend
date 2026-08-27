import User from '../../models/User.model.js';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * Handle user login
 */
export const login = asyncHandler(async (req, res) => {
    const { memberId, password } = req.body;

    if (!memberId || !password) {
        throw new ApiError(400, 'Member ID and password are required');
    }

    const user = await User.findOne({ memberId });
    if (!user) {
        throw new ApiError(401, 'Invalid credentials');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new ApiError(401, 'Invalid credentials');
    }

    const token = jwt.sign(
        { userId: user._id, memberId: user.memberId, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
    );

    return res.status(200).json(
        new ApiResponse(200, {
            token,
            user: {
                memberId: user.memberId,
                fullName: user.fullName,
                role: user.role
            }
        }, "Login successful")
    );
});
