import UserFinance from '../../models/UserFinance.model.js';
import User from '../../models/User.model.js';
import Payout from '../../models/Payout.model.js';
import BVTransaction from '../../models/BVTransaction.model.js';
import WalletAdjustmentLog from '../../models/WalletAdjustmentLog.model.js';
import { payoutService } from '../../services/business/payout.service.js';
import { mlmService } from '../../services/business/mlm.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * Get BV Summary for a user
 */
export const getBVSummary = asyncHandler(async (req, res) => {
    // Fetch from UserFinance
    const finance = await UserFinance.findOne({ user: req.user._id })
        .select('leftLegBV rightLegBV carryForwardLeft carryForwardRight totalBV personalBV thisMonthBV personalPV leftLegPV rightLegPV totalPV thisMonthPV');

    // Fallback if migration hasn't run yet or user is new (should be handled by migration)
    if (!finance) throw new ApiError(404, 'Financial record not found. Please contact support.');

    // Fetch recent transactions
    const transactions = await BVTransaction.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(10);

    return res.status(200).json(
        new ApiResponse(200, { summary: finance, recentTransactions: transactions }, 'BV Summary fetched')
    );
});

/**
 * Get Funds Status
 */
export const getFundsStatus = asyncHandler(async (req, res) => {
    const finance = await UserFinance.findOne({ user: req.user._id })
        .select('bikeCarFund houseFund royaltyFund ssvplSuperBonus lsp msp');

    if (!finance) throw new ApiError(404, 'Financial record not found');

    return res.status(200).json(
        new ApiResponse(200, finance, 'Funds and Stock Point status fetched')
    );
});

/**
 * Request a payout / withdrawal
 */
export const requestPayout = asyncHandler(async (req, res) => {
    // Manual requests are disabled
    throw new ApiError(403, 'Manual payout requests are disabled. Payouts are generated automatically on Friday nights.');
});

/**
 * Get Wallet and Earnings History
 */
export const getWalletInfo = asyncHandler(async (req, res) => {
    const finance = await UserFinance.findOne({ user: req.user._id }).select('wallet');
    if (!finance) throw new ApiError(404, 'Wallet info not found');

    const history = await Payout.find({ userId: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, { wallet: finance.wallet, history }, 'Wallet info fetched')
    );
});

/**
 * Get Payout History (Dedicated Endpoint)
 */
export const getPayouts = asyncHandler(async (req, res) => {
    const payouts = await Payout.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(
        new ApiResponse(200, payouts, 'Payout history fetched')
    );
});

/**
 * Get Genealogy Tree
 */
/**
 * Get Genealogy Tree
 */
export const getTree = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const { depth } = req.query; // Support custom depth

    let targetUser;

    if (memberId) {
        targetUser = await User.findOne({ memberId });
    } else {
        targetUser = await User.findById(req.user._id);
    }

    if (!targetUser) throw new ApiError(404, 'User not found');

    // Parse depth
    let treeDepth = 3;
    if (depth) {
        treeDepth = parseInt(depth);
        if (isNaN(treeDepth)) treeDepth = 3;
        // No max limit as per requirement
    }

    const tree = await mlmService.getGenealogyTree(targetUser._id, treeDepth);

    return res.status(200).json(
        new ApiResponse(200, tree, 'Genealogy tree fetched successfully')
    );
});
/**
 * Get Bonus System Status (Fast Track & Star Matching)
 */
/**
 * Get Bonus System Status (Fast Track & Star Matching)
 */
export const getBonusStatus = asyncHandler(async (req, res) => {
    const finance = await UserFinance.findOne({ user: req.user._id })
        .select('fastTrack starMatchingBonus starMatching wallet');

    if (!finance) throw new ApiError(404, 'Financial record not found');

    // Fetch recent 5 payouts for history
    const fastTrackHistory = await Payout.find({
        userId: req.user._id,
        payoutType: 'fast-track-bonus'
    }).sort({ createdAt: -1 }).limit(5);

    const starMatchingHistory = await Payout.find({
        userId: req.user._id,
        payoutType: 'star-matching-bonus'
    }).sort({ createdAt: -1 }).limit(5);

    return res.status(200).json(
        new ApiResponse(200, {
            fastTrack: {
                dailyClosings: finance.fastTrack.dailyClosings,
                lastClosingTime: finance.fastTrack.lastClosingTime,
                pendingLeft: finance.fastTrack.pendingPairLeft,
                pendingRight: finance.fastTrack.pendingPairRight,
                carryForwardLeft: finance.fastTrack.carryForwardLeft,
                carryForwardRight: finance.fastTrack.carryForwardRight,
                totalEarned: finance.fastTrack.totalEarned,
                overallTotalEarnings: finance.wallet.totalEarnings, // Added as requested
                history: fastTrackHistory
            },
            starMatching: {
                dailyClosings: finance.starMatchingBonus.dailyClosings,
                lastClosingTime: finance.starMatchingBonus.lastClosingTime,
                pendingLeft: finance.starMatchingBonus.pendingStarsLeft,
                pendingRight: finance.starMatchingBonus.pendingStarsRight,
                carryForwardLeft: finance.starMatchingBonus.carryForwardStarsLeft,
                carryForwardRight: finance.starMatchingBonus.carryForwardStarsRight,
                accumulatedStars: finance.starMatching,
                totalEarned: finance.starMatchingBonus.totalEarned,
                history: starMatchingHistory
            }
        }, 'Bonus status fetched')
    );
});

/**
 * Get Separated Fast Track Status
 */
export const getFastTrackBonusStatus = asyncHandler(async (req, res) => {
    const finance = await UserFinance.findOne({ user: req.user._id })
        .select('fastTrack wallet');

    if (!finance) throw new ApiError(404, 'Financial record not found');

    const history = await Payout.find({
        userId: req.user._id,
        payoutType: { $in: ['fast-track-bonus', 'fast-track-deduction', 'fast-track-flashout'] }
    }).sort({ createdAt: -1 }).limit(10);

    return res.status(200).json(
        new ApiResponse(200, {
            dailyClosings: finance.fastTrack.dailyClosings,
            lastClosingTime: finance.fastTrack.lastClosingTime,
            pendingLeft: finance.fastTrack.pendingPairLeft,
            pendingRight: finance.fastTrack.pendingPairRight,
            carryForwardLeft: finance.fastTrack.carryForwardLeft,
            carryForwardRight: finance.fastTrack.carryForwardRight,
            totalEarned: finance.fastTrack.totalEarned,
            overallTotalEarnings: finance.wallet.totalEarnings, // Added as requested
            history
        }, 'Fast Track Bonus status fetched')
    );
});

/**
 * Get Separated Star Matching Status
 */
export const getStarMatchingBonusStatus = asyncHandler(async (req, res) => {
    const finance = await UserFinance.findOne({ user: req.user._id })
        .select('starMatchingBonus starMatching');

    if (!finance) throw new ApiError(404, 'Financial record not found');

    const history = await Payout.find({
        userId: req.user._id,
        payoutType: { $in: ['star-matching-bonus', 'star-matching-flashout'] }
    }).sort({ createdAt: -1 }).limit(10);

    return res.status(200).json(
        new ApiResponse(200, {
            dailyClosings: finance.starMatchingBonus.dailyClosings,
            lastClosingTime: finance.starMatchingBonus.lastClosingTime,
            pendingLeft: finance.starMatchingBonus.pendingStarsLeft,
            pendingRight: finance.starMatchingBonus.pendingStarsRight,
            carryForwardLeft: finance.starMatchingBonus.carryForwardStarsLeft,
            carryForwardRight: finance.starMatchingBonus.carryForwardStarsRight,
            accumulatedStars: finance.starMatching,
            totalEarned: finance.starMatchingBonus.totalEarned,
            history
        }, 'Star Matching Bonus status fetched')
    );
});

/**
 * Get Tree BV Summary for the authenticated user
 */
export const getTreeBVSummary = asyncHandler(async (req, res) => {
    const { treeBvService } = await import('../../services/business/treeBv.service.js');
    
    // Process using the authenticated user's ID
    const summary = await treeBvService.getTreeBVSummary(req.user._id);

    return res.status(200).json(
        new ApiResponse(200, summary, 'Tree BV Summary fetched successfully')
    );
});

/**
 * Get Tree BV Summary for ANY user via memberId (Public Route)
 */
export const getPublicTreeBVSummary = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const User = (await import('../../models/User.model.js')).default;
    const targetUser = await User.findOne({ memberId });

    if (!targetUser) {
        throw new ApiError(404, 'User not found');
    }

    const { treeBvService } = await import('../../services/business/treeBv.service.js');
    const summary = await treeBvService.getTreeBVSummary(targetUser._id);

    return res.status(200).json(
        new ApiResponse(200, summary, 'Public Tree BV Summary fetched successfully')
    );
});


/**
 * @desc    Get Manual Wallet Adjustment Logs for User
 * @route   GET /api/v1/user/wallet-adjustments
 * @access  Private
 */
export const getMyWalletAdjustments = asyncHandler(async (req, res) => {
    const logs = await WalletAdjustmentLog.find({ user: req.user._id })
        .populate('admin', 'fullName memberId')
        .sort({ createdAt: -1 });

    res.status(200).json(
        new ApiResponse(200, logs, "Wallet adjustments retrieved successfully")
    );
});

/**
 * @desc    Get Isolated Rank Bonus Incomes for User
 * @route   GET /api/v1/user/incomes/isolated-rank
 * @access  Private
 */
export const getIsolatedRankIncomes = asyncHandler(async (req, res) => {
    const payouts = await Payout.find({ 
        userId: req.user._id,
        payoutType: 'isolated-rank-bonus'
    }).sort({ createdAt: -1 });

    res.status(200).json(
        new ApiResponse(200, payouts, "Isolated rank bonus incomes retrieved successfully")
    );
});
