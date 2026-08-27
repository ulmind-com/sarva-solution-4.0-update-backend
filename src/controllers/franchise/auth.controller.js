import Franchise from '../../models/Franchise.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * @desc    Franchise Login
 * @route   POST /api/v1/franchise/login
 * @access  Public
 */
export const loginFranchise = asyncHandler(async (req, res) => {
    const { vendorId, password } = req.body; // Can accept email too logic below

    if (!vendorId || !password) {
        throw new ApiError(400, 'Vendor ID/Email and password are required');
    }

    // Find by VendorID or Email
    const franchise = await Franchise.findOne({
        $or: [{ vendorId: vendorId }, { email: vendorId.toLowerCase() }]
    });

    if (!franchise) {
        throw new ApiError(401, 'Invalid credentials');
    }

    // Check blocked status
    if (franchise.isBlocked) {
        throw new ApiError(403, `Account Suspended. Reason: ${franchise.blockReason}`);
    }

    // Check Password
    const isMatch = await bcrypt.compare(password, franchise.password);
    if (!isMatch) {
        // Increment login attempts logic could go here
        throw new ApiError(401, 'Invalid credentials');
    }

    // Generate Token
    const token = jwt.sign(
        {
            franchiseId: franchise._id,
            vendorId: franchise.vendorId,
            role: 'franchise'
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '365d' }
    );

    // Update login stats
    franchise.lastLogin = new Date();
    franchise.loginAttempts = 0;
    await franchise.save();

    const franchiseData = franchise.toObject();
    delete franchiseData.password;

    return res.status(200).json(
        new ApiResponse(200, {
            token,
            franchise: franchiseData
        }, 'Login successful')
    );
});
