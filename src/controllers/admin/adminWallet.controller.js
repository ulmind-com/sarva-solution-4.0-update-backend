import User from '../../models/User.model.js';
import UserFinance from '../../models/UserFinance.model.js';
import WalletAdjustmentLog from '../../models/WalletAdjustmentLog.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * @desc    Adjust user wallet balance (Add or Deduct)
 * @route   POST /api/v1/admin/wallet/adjust
 * @access  Private/Admin
 */
export const adjustWalletBalance = asyncHandler(async (req, res) => {
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

    // 3. Fetch User Finance
    let finance = await UserFinance.findOne({ user: user._id });
    if (!finance) {
        // Technically this shouldn't happen, but create if missing to be safe
        finance = await UserFinance.create({
            user: user._id,
            memberId: user.memberId,
            wallet: { totalEarnings: 0, availableBalance: 0, withdrawnAmount: 0, pendingWithdrawal: 0 }
        });
    }

    // 4. Handle Adjustments
    const previousBalance = finance.wallet.availableBalance;
    let newBalance = previousBalance;

    if (action === 'Credit') {
        newBalance += numericAmount;
    } else if (action === 'Debit') {
        if (previousBalance < numericAmount) {
            throw new ApiError(400, `Insufficient wallet balance. Cannot deduct ₹${numericAmount} as available balance is ₹${previousBalance}.`);
        }
        newBalance -= numericAmount;
    }

    // 5. Save changes
    finance.wallet.availableBalance = newBalance;
    await finance.save();

    // 6. Log the transaction securely
    await WalletAdjustmentLog.create({
        user: user._id,
        memberId: user.memberId,
        admin: req.user._id, // Set mostly by Admin Auth Middleware
        action,
        amount: numericAmount,
        previousBalance,
        newBalance,
        remarks: remarks || 'Manual adjustment by Admin'
    });

    return res.status(200).json(
        new ApiResponse(200, {
            memberId: user.memberId,
            name: user.fullName,
            action,
            amount: numericAmount,
            newBalance
        }, `Successfully performed ${action} of ₹${numericAmount} for ${user.memberId}.`)
    );
});

/**
 * @desc    Get Manual Wallet Adjustment Logs for Admin Panel
 * @route   GET /api/v1/admin/wallet/adjustment-logs
 * @access  Private/Admin
 */
export const getWalletAdjustmentLogs = asyncHandler(async (req, res) => {
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

    const logs = await WalletAdjustmentLog.find(query)
        .populate('admin', 'fullName memberId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await WalletAdjustmentLog.countDocuments(query);

    res.status(200).json(
        new ApiResponse(200, {
            logs,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        }, "Logs retrieved successfully")
    );
});
