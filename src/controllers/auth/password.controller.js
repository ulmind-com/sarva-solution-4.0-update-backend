import User from '../../models/User.model.js';
import { sendEmail } from '../../services/integration/mail.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import crypto from 'crypto';

/**
 * Forgot Password
 * Sends reset token to email
 */
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        throw new ApiError(404, 'Email not found');
    }

    // Get Reset Token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create Reset URL
    const resetUrl = `https://sarvasolutionvision.com/reset-password/${resetToken}`; // Adjust frontend URL

    // Message
    const message = `
        You requested a password reset. 
        Please click the link below to reset your password:
        \n\n${resetUrl}\n\n
        If you did not request this, please ignore this email.
    `;

    try {
        await sendEmail({
            to: user.email,
            subject: 'Password Reset Token',
            html: `
                <h1>Password Reset Request</h1>
                <p>You requested a password reset.</p>
                <p>Click details below to reset:</p>
                <a href="${resetUrl}" style="background:#2563EB;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Password</a>
                <p>Or copy this link: ${resetUrl}</p>
                <p>This link expires in 10 minutes.</p>
            `
        });

        return res.status(200).json(
            new ApiResponse(200, {}, 'Email sent successfully')
        );
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        throw new ApiError(500, 'Email could not be sent');
    }
});

/**
 * Reset Password
 * Verifies token and updates password
 */
export const resetPassword = asyncHandler(async (req, res) => {
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resetToken)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
        throw new ApiError(400, 'Invalid token or token expired');
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return res.status(200).json(
        new ApiResponse(200, {}, 'Password updated successfully')
    );
});
