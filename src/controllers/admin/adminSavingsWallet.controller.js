import User from '../../models/User.model.js';
import SavingsWallet from '../../models/SavingsWallet.model.js';
import SavingsWalletAdjustmentLog from '../../models/SavingsWalletAdjustmentLog.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * @desc    Adjust a user's Savings Wallet balance (Add or Deduct)
 * @route   POST /api/v1/admin/savings-wallet/adjust
 * @access  Private/Admin
 */
export const adjustSavingsWalletBalance = asyncHandler(async (req, res) => {
    const { memberId, action, amount, remarks } = req.body;

    // 1. Validate Input
    if (!memberId || !action || !amount) {
        throw new ApiError(400, 'Member ID, action, and amount are required.');
    }

    if (!['Credit', 'Debit'].includes(action)) {
        throw new ApiError(400, 'Action must be either Credit or Debit.');
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new ApiError(400, 'Amount must be a positive number greater than 0.');
    }

    // 2. Fetch User
    const user = await User.findOne({ memberId });
    if (!user) {
        throw new ApiError(404, `User with Member ID ${memberId} not found.`);
    }

    // 3. Fetch (or create) the user's Savings Wallet
    let wallet = await SavingsWallet.findOne({ user: user._id });
    if (!wallet) {
        wallet = await SavingsWallet.create({
            user: user._id,
            memberId: user.memberId,
            balance: 0,
            totalCredited: 0
        });
    }

    // 4. Handle Adjustment
    const previousBalance = wallet.balance;
    let newBalance = previousBalance;

    if (action === 'Credit') {
        newBalance += numericAmount;
    } else if (action === 'Debit') {
        if (previousBalance < numericAmount) {
            throw new ApiError(400, `Insufficient savings balance. Cannot deduct ₹${numericAmount} as available balance is ₹${previousBalance}.`);
        }
        newBalance -= numericAmount;
    }

    // 5. Save changes
    wallet.balance = newBalance;
    await wallet.save();

    // 6. Log the transaction securely
    await SavingsWalletAdjustmentLog.create({
        user: user._id,
        memberId: user.memberId,
        admin: req.user._id,
        action,
        amount: numericAmount,
        previousBalance,
        newBalance,
        remarks: remarks || 'Manual savings adjustment by Admin'
    });

    return res.status(200).json(
        new ApiResponse(200, {
            memberId: user.memberId,
            name: user.fullName,
            action,
            amount: numericAmount,
            newBalance
        }, `Successfully performed ${action} of ₹${numericAmount} on Savings Wallet for ${user.memberId}.`)
    );
});

/**
 * @desc    Get Savings Wallet Manual Adjustment Logs for Admin Panel
 * @route   GET /api/v1/admin/savings-wallet/adjustment-logs
 * @access  Private/Admin
 */
export const getSavingsWalletAdjustmentLogs = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.memberId) {
        query.memberId = new RegExp(req.query.memberId, 'i');
    }
    if (req.query.action) {
        query.action = req.query.action;
    }

    const logs = await SavingsWalletAdjustmentLog.find(query)
        .populate('admin', 'fullName memberId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await SavingsWalletAdjustmentLog.countDocuments(query);

    res.status(200).json(
        new ApiResponse(200, {
            logs,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        }, "Savings wallet logs retrieved successfully")
    );
});
