import User from '../../models/User.model.js';
import BankAccount from '../../models/BankAccount.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../services/integration/cloudinary.service.js';
import { mailer } from '../../services/integration/mail.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * Update user profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const body = req.body || {};

    let {
        fullName,
        email,
        phone,
        panCardNumber,
        address,
        bankDetails,
        nominee,
        username
    } = body;

    // Handle nested objects if sent as strings via FormData
    try {
        if (typeof bankDetails === 'string' && bankDetails.trim().startsWith('{')) {
            bankDetails = JSON.parse(bankDetails);
        }
        if (typeof address === 'string' && address.trim().startsWith('{')) {
            address = JSON.parse(address);
        }
        if (typeof nominee === 'string' && nominee.trim().startsWith('{')) {
            nominee = JSON.parse(nominee);
        }
    } catch (e) {
        console.error('Error parsing JSON fields in profile update:', e);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const updatedFields = [];

    // Phone uniqueness check
    if (phone && phone !== user.phone) {
        const phoneExists = await User.findOne({ phone });
        if (phoneExists) {
            throw new ApiError(400, 'Phone number already in use');
        }
        user.phone = phone;
        updatedFields.push('Phone Number');
    }

    // PAN Card Update - STRICT RULE: User cannot update PAN once set
    if (panCardNumber && panCardNumber.toUpperCase() !== user.panCardNumber) {
        // Check if user already has PAN set
        if (user.panCardNumber) {
            throw new ApiError(400, 'PAN card number cannot be modified once added. Please contact admin for changes.');
        }

        // First time adding PAN -> must be unique (one PAN = one account going forward).
        // Existing users who already share a PAN are unaffected (no DB unique index added).
        const panCount = await User.countDocuments({ panCardNumber: panCardNumber.toUpperCase() });
        if (panCount >= 1) {
            throw new ApiError(400, 'This PAN card is already registered. Only one account is allowed per PAN card.');
        }
        user.panCardNumber = panCardNumber.toUpperCase();
        updatedFields.push('PAN Card Number');
    }

    // Aadhar Card Update - STRICT RULE: User cannot update Aadhar once set
    if (body.aadharCardNumber && body.aadharCardNumber !== user.aadharCardNumber) {
        // Check if user already has Aadhar set
        if (user.aadharCardNumber) {
            throw new ApiError(400, 'Aadhar card number cannot be modified once added. Please contact admin for changes.');
        }

        // First time adding Aadhar -> Allow
        user.aadharCardNumber = body.aadharCardNumber;
        updatedFields.push('Aadhar Card Number');
    }

    // Update basic fields (Removed fullName to prevent user from changing it)
    if (email && email !== user.email) {
        user.email = email;
        updatedFields.push('Email Address');
    }
    if (username && username !== user.username) {
        user.username = username;
        updatedFields.push('Username');
    }
    if (address) {
        user.address = { ...user.address, ...address };
        updatedFields.push('Address');
    }
    if (nominee) {
        user.nominee = { ...(user.nominee || {}), ...nominee };
        updatedFields.push('Nominee Details');
    }

    // Profile Picture
    if (req.file) {
        // Delete old profile picture if exists
        if (user.profilePicture?.publicId) {
            await deleteFromCloudinary(user.profilePicture.publicId);
        }

        const uploadResult = await uploadToCloudinary(req.file.buffer, 'sarvasolution/profiles');
        user.profilePicture = uploadResult;
        updatedFields.push('Profile Picture');
    }

    await user.save();

    // Bank Account logic
    if (bankDetails) {
        let bankAccount = await BankAccount.findOne({ userId });

        if (bankAccount) {
            // STRICT RULE: User cannot update bank details more than once.
            throw new ApiError(400, "Bank details cannot be modified once added. Please contact admin for changes.");
        } else {
            // First time adding bank details -> Allow
            bankAccount = new BankAccount({ ...bankDetails, userId });
            await bankAccount.save();
            updatedFields.push('Bank Details');
        }
    }

    // Notifications
    if (updatedFields.length > 0) {
        mailer.sendUpdateNotification(user, updatedFields).catch(err => console.error('Profile update mail error:', err));
    }

    const updatedUser = await User.findById(userId).select('-password');
    const updatedBank = await BankAccount.findOne({ userId });

    return res.status(200).json(
        new ApiResponse(200, {
            user: updatedUser,
            bankAccount: updatedBank || null
        }, 'Profile updated successfully')
    );
});
