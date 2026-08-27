import User from '../../models/User.model.js';
import BankAccount from '../../models/BankAccount.model.js';
import { uploadToCloudinary } from '../../services/integration/cloudinary.service.js';
import { mailer } from '../../services/integration/mail.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * Handle KYC submission (One-time)
 */
export const submitKYC = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { aadhaarNumber, panCardNumber, bankDetails: bankDetailsStr } = req.body;
    const files = req.files;

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // Enforce "Only Once" rule
    if (user.kyc && ['pending', 'approved'].includes(user.kyc.status)) {
        throw new ApiError(400, `KYC submission is already ${user.kyc.status}.`);
    }

    // PAN must be unique (one PAN = one account going forward).
    // Exclude the user's own record; existing shared PANs are unaffected.
    if (panCardNumber) {
        const panTaken = await User.countDocuments({
            panCardNumber: panCardNumber.toUpperCase(),
            _id: { $ne: user._id }
        });
        if (panTaken >= 1) {
            throw new ApiError(400, 'This PAN card is already registered. Only one account is allowed per PAN card.');
        }
    }

    // Validate required files
    if (!files || !files.aadhaarFront || !files.aadhaarBack || !files.panImage) {
        throw new ApiError(400, 'All KYC documents (Aadhaar Front, Aadhaar Back, PAN Image) are required.');
    }

    // Upload to Cloudinary
    const uploadResults = {};
    const uploadPromises = [
        { key: 'aadhaarFront', buffer: files.aadhaarFront[0].buffer },
        { key: 'aadhaarBack', buffer: files.aadhaarBack[0].buffer },
        { key: 'panImage', buffer: files.panImage[0].buffer }
    ].map(async ({ key, buffer }) => {
        const result = await uploadToCloudinary(buffer, `sarvasolution/kyc/${user.memberId}`);
        uploadResults[key] = result;
    });
    await Promise.all(uploadPromises);

    // Update User KYC
    user.kyc = {
        status: 'pending',
        aadhaarNumber,
        panCardNumber: panCardNumber.toUpperCase(),
        aadhaarFront: uploadResults.aadhaarFront,
        aadhaarBack: uploadResults.aadhaarBack,
        panImage: uploadResults.panImage,
        submittedAt: new Date()
    };

    if (panCardNumber) user.panCardNumber = panCardNumber.toUpperCase();
    await user.save();

    // Notification
    mailer.sendKYCSubmission(user).catch(err => console.error('KYC submission mail error:', err));

    // Handle Bank Details
    if (bankDetailsStr) {
        try {
            const bankDetails = JSON.parse(bankDetailsStr);
            const { accountName, accountNumber, bankName, ifscCode } = bankDetails;

            // Explicit validation for required fields to avoid ValidatorError
            if (!accountName || !accountNumber || !bankName || !ifscCode) {
                console.warn('Bank detail sync skipped: Missing required fields', { accountName, accountNumber, bankName, ifscCode });
            } else {
                let bankAccount = await BankAccount.findOne({ userId });
                if (bankAccount) {
                    Object.assign(bankAccount, bankDetails);
                    await bankAccount.save();
                } else {
                    bankAccount = new BankAccount({ ...bankDetails, userId });
                    await bankAccount.save();
                }
            }
        } catch (e) {
            console.error('Bank details sync error:', e);
        }
    }

    return res.status(200).json(
        new ApiResponse(200, user.kyc, 'KYC submitted successfully for verification.')
    );
});
