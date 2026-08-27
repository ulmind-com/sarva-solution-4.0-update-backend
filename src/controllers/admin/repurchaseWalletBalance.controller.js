import User from '../../models/User.model.js';
import SavingsWallet from '../../models/SavingsWallet.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * @desc    Get a member's Repurchase Wallet (formerly Savings Wallet) balance by Member ID
 * @route   GET /api/v1/admin/repurchase-wallet-balance/:memberId
 * @access  Private/Admin
 *
 * ISOLATED ENDPOINT — does NOT touch any existing code.
 * Simply reads the SavingsWallet collection for the given member.
 */
export const getRepurchaseWalletBalance = asyncHandler(async (req, res) => {
    const { memberId } = req.params;

    if (!memberId) {
        throw new ApiError(400, 'Member ID is required.');
    }

    // 1. Find the user
    const user = await User.findOne({ memberId }).select('_id memberId fullName').lean();
    if (!user) {
        throw new ApiError(404, `User with Member ID ${memberId} not found.`);
    }

    // 2. Find the wallet (may not exist if user never received savings credit)
    const wallet = await SavingsWallet.findOne({ user: user._id }).select('balance totalCredited').lean();

    return res.status(200).json(
        new ApiResponse(200, {
            memberId: user.memberId,
            fullName: user.fullName,
            balance: wallet?.balance ?? 0,
            totalCredited: wallet?.totalCredited ?? 0,
        }, `Repurchase Wallet balance retrieved for ${memberId}.`)
    );
});
