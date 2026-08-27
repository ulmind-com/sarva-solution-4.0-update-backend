import SavingsWallet from '../../models/SavingsWallet.model.js';
import SavingsWalletCredit from '../../models/SavingsWalletCredit.model.js';
import SavingsWalletAdjustmentLog from '../../models/SavingsWalletAdjustmentLog.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * GET /api/v1/user/savings-wallet
 * Returns the user's Savings Wallet balance summary.
 */
export const getSavingsWallet = asyncHandler(async (req, res) => {
    const wallet = await SavingsWallet.findOne({ user: req.user._id }).lean();
    const data = {
        balance:       wallet?.balance || 0,
        totalCredited: wallet?.totalCredited || 0
    };
    return res.status(200).json(new ApiResponse(200, data, 'Savings wallet fetched'));
});

/**
 * GET /api/v1/user/savings-wallet/history
 * Returns the user's Savings Wallet credit history (latest first).
 */
export const getSavingsWalletHistory = asyncHandler(async (req, res) => {
    const history = await SavingsWalletCredit.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .lean();
    return res.status(200).json(new ApiResponse(200, history, 'Savings wallet history fetched'));
});

/**
 * GET /api/v1/user/savings-wallet/adjustments
 * Returns the manual Credit/Debit adjustments an admin made on the user's Savings Wallet.
 */
export const getMySavingsWalletAdjustments = asyncHandler(async (req, res) => {
    const logs = await SavingsWalletAdjustmentLog.find({ user: req.user._id })
        .populate('admin', 'fullName memberId')
        .sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, logs, 'Savings wallet adjustments fetched'));
});
