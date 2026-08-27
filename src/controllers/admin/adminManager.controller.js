import User from '../../models/User.model.js';
import Payout from '../../models/Payout.model.js';
import BVTransaction from '../../models/BVTransaction.model.js';
import { mlmService } from '../../services/business/mlm.service.js';
import { mailer } from '../../services/integration/mail.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { getISTStartOfDay, getISTDate } from '../../utils/date.util.js';

/**
 * Get Admin Dashboard Metrics
 */
export const getDashboardMetrics = asyncHandler(async (req, res) => {
    const totalMembers = await User.countDocuments({ role: 'user' });
    const activeMembers = await User.countDocuments({ status: 'active', role: 'user' });

    // Today's BV Volume
    const startOfDay = getISTStartOfDay(); // Returns UTC Date corresponding to IST 00:00
    const todayBV = await BVTransaction.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: "$bvAmount" } } }
    ]);

    // Pending Payouts
    const pendingPayouts = await Payout.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, totalAmount: { $sum: "$netAmount" }, count: { $sum: 1 } } }
    ]);

    // Rank stats
    const rankStats = await User.aggregate([
        { $group: { _id: "$currentRank", count: { $sum: 1 } } }
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            members: { total: totalMembers, active: activeMembers },
            volume: { todayBV: todayBV[0]?.total || 0 },
            finance: {
                pendingAmount: pendingPayouts[0]?.totalAmount || 0,
                pendingCount: pendingPayouts[0]?.count || 0
            },
            ranks: rankStats
        }, 'Dashboard metrics fetched')
    );
});

/**
 * Get All Payouts (Admin)
 */
export const getPayouts = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = {};

    // Normalize status to lowercase if present
    const queryStatus = status ? status.toLowerCase() : null;

    // BASE FILTER: ALWAYS filter by 'withdrawal' type as this is the Payout Request API
    filter.payoutType = 'withdrawal';

    if (queryStatus === 'pending') {
        filter.status = 'pending';
    } else if (queryStatus === 'accepted' || queryStatus === 'completed') {
        filter.status = 'completed';
    } else if (queryStatus === 'rejected') {
        filter.status = 'rejected';
    } else if (queryStatus === 'all') {
        // User Requirement: "all" means Accepted + Rejected (History), EXCLUDING Pending
        filter.status = { $in: ['completed', 'rejected'] };
    } else {
        // Default behavior:
        // If status WAS provided but didn't match above (e.g. invalid string), we should return NOTHING or filter by that invalid status.
        // If status was NOT provided (null/undefined), we show everything (Safe Default).

        if (status) {
            // Status provided but invalid/unknown -> likely returns 0 results
            filter.status = status;
        } else {
            // No status provided -> Show everything relevant (Pending + Completed + Rejected withdrawals)
            filter.status = { $in: ['pending', 'completed', 'rejected'] };
        }
    }

    const payouts = await Payout.find(filter)
        .sort({ createdAt: -1 })
        .populate('userId', 'fullName email phone kyc bankDetails');

    return res.status(200).json(
        new ApiResponse(200, payouts, 'Payouts fetched successfully')
    );
});

/**
 * Process Payout (Approve/Reject)
 */
export const processPayout = asyncHandler(async (req, res) => {
    const { payoutId, status, rejectionReason } = req.body;

    if (!['completed', 'rejected'].includes(status)) {
        throw new ApiError(400, 'Invalid status. Use "completed" (Approve) or "rejected" (Reject).');
    }

    const payout = await Payout.findById(payoutId);
    if (!payout) throw new ApiError(404, 'Payout request not found');

    if (payout.status !== 'pending') {
        throw new ApiError(400, `Payout is already ${payout.status}`);
    }

    const user = await User.findById(payout.userId);
    if (!user) throw new ApiError(404, 'User associated with payout not found');

    if (status === 'completed') {
        // APPROVE: Money sent to bank.
        // Action: Clear pending flags. 
        // Note: 'withdrawnAmount' was already increased at request time, so we leave it.
        // 'availableBalance' was already decreased, so we leave it.
        // Just reduce the pending tracker.

        user.wallet.pendingWithdrawal -= payout.netAmount;
        if (user.wallet.pendingWithdrawal < 0) user.wallet.pendingWithdrawal = 0; // Safety

        payout.status = 'completed';
        payout.processedAt = getISTDate();

        // Notify User
        mailer.payoutProcessed(user, payout.netAmount, payout.payoutType).catch(err => console.error('Payout mail error:', err));

    } else if (status === 'rejected') {
        // REJECT: Refund money.
        // Action: Revert all wallet changes made during request.

        user.wallet.availableBalance += payout.grossAmount; // Refund gross (fee included)
        user.wallet.pendingWithdrawal -= payout.netAmount; // Clear pending
        user.wallet.withdrawnAmount -= payout.grossAmount; // Revert "withdraw" stat

        if (user.wallet.pendingWithdrawal < 0) user.wallet.pendingWithdrawal = 0;
        if (user.wallet.withdrawnAmount < 0) user.wallet.withdrawnAmount = 0;

        payout.status = 'rejected';
        payout.metadata = { ...payout.metadata, rejectionReason };
    }

    await user.save();
    await payout.save();

    return res.status(200).json(
        new ApiResponse(200, payout, `Payout ${status} successfully`)
    );
});

/**
 * Accept Payout (Approve)
 * Dedicated endpoint for accepting payout requests
 */
export const acceptPayout = asyncHandler(async (req, res) => {
    const { payoutId } = req.params;

    const payout = await Payout.findById(payoutId);
    if (!payout) throw new ApiError(404, 'Payout request not found');

    if (payout.status !== 'pending') {
        throw new ApiError(400, `Cannot accept payout. Current status: ${payout.status}`);
    }

    const user = await User.findById(payout.userId);
    if (!user) throw new ApiError(404, 'User associated with payout not found');

    // APPROVE: Money sent to bank
    // Clear pending withdrawal from user wallet
    user.wallet.pendingWithdrawal -= payout.netAmount;
    if (user.wallet.pendingWithdrawal < 0) user.wallet.pendingWithdrawal = 0; // Safety check

    payout.status = 'completed';
    payout.processedAt = getISTDate();

    await user.save();
    await payout.save();

    // Send notification email
    mailer.payoutProcessed(user, payout.netAmount, payout.payoutType)
        .catch(err => console.error('Payout notification email error:', err));

    return res.status(200).json(
        new ApiResponse(200, payout, 'Payout accepted successfully')
    );
});

/**
 * Reject Payout
 * Dedicated endpoint for rejecting payout requests with reason
 */
export const rejectPayout = asyncHandler(async (req, res) => {
    const { payoutId } = req.params;
    const { rejectionReason } = req.body;

    // Validation
    if (!rejectionReason || rejectionReason.trim().length < 10) {
        throw new ApiError(400, 'Rejection reason is required and must be at least 10 characters');
    }

    const payout = await Payout.findById(payoutId);
    if (!payout) throw new ApiError(404, 'Payout request not found');

    if (payout.status !== 'pending') {
        throw new ApiError(400, `Cannot reject payout. Current status: ${payout.status}`);
    }

    const user = await User.findById(payout.userId);
    if (!user) throw new ApiError(404, 'User associated with payout not found');

    // REJECT: Refund money to user wallet
    user.wallet.availableBalance += payout.grossAmount; // Refund gross amount
    user.wallet.pendingWithdrawal -= payout.netAmount; // Clear pending
    user.wallet.withdrawnAmount -= payout.grossAmount; // Revert withdrawal counter

    // Safety checks to prevent negative balances
    if (user.wallet.pendingWithdrawal < 0) user.wallet.pendingWithdrawal = 0;
    if (user.wallet.withdrawnAmount < 0) user.wallet.withdrawnAmount = 0;

    payout.status = 'rejected';
    payout.metadata = { ...payout.metadata, rejectionReason: rejectionReason.trim() };

    await user.save();
    await payout.save();

    return res.status(200).json(
        new ApiResponse(200, payout, 'Payout rejected successfully')
    );
});

/**
 * Manual BV Allocation (Admin Adjustment)
 */
export const addManualBV = asyncHandler(async (req, res) => {
    const { memberId, bvAmount, leg, description } = req.body;

    const user = await User.findOne({ memberId });
    if (!user) throw new ApiError(404, 'User not found');

    if (leg === 'left') user.leftLegBV += Number(bvAmount);
    else if (leg === 'right') user.rightLegBV += Number(bvAmount);
    else user.personalBV += Number(bvAmount);

    user.totalBV += Number(bvAmount);
    await user.save();

    // Record Transaction
    await BVTransaction.create({
        userId: user._id,
        transactionType: 'admin-adjustment',
        bvAmount: Number(bvAmount),
        legAffected: leg || 'none',
        description: description || 'Manual adjustment by Admin'
    });

    // Propagate if it's a leg BV
    if (leg === 'left' || leg === 'right') {
        await mlmService.propagateBVUpTree(user._id, leg, Number(bvAmount), 'admin-adjustment', 'ADMIN-ADJ');
    }

    return res.status(200).json(
        new ApiResponse(200, user, 'BV allocated successfully')
    );
});

/**
 * Get Global Transaction History (Audit Log)
 */
export const getAllTransactions = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type, memberId, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};

    if (type) filter.transactionType = type;

    if (memberId) {
        const user = await User.findOne({ memberId });
        if (user) filter.userId = user._id;
    }

    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const transactions = await BVTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'fullName memberId');

    const total = await BVTransaction.countDocuments(filter);

    return res.status(200).json(
        new ApiResponse(200, {
            transactions,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        }, 'Transactions fetched successfully')
    );
});
/**
 * Trigger Bonus Matching Manually (Admin)
 */
export const triggerBonusMatching = asyncHandler(async (req, res) => {
    const { memberId, type } = req.body; // type: 'fast-track' or 'star-matching'

    if (!memberId || !type) {
        throw new ApiError(400, 'Member ID and bonus type (fast-track/star-matching) are required');
    }

    const user = await User.findOne({ memberId });
    if (!user) throw new ApiError(404, 'User not found');

    // Dynamic import inside function is tricky if not ES modules with top-level await support in all contexts (though Node 14+ supports it). 
    // SAFEST: Move to top.
    // Or use: const { matchingService } = await import('../../services/matching.service.js');

    // Let's use dynamic import syntax properly:
    const { matchingService } = await import('../../services/business/matching.service.js');

    let resultMsg = '';
    if (type === 'fast-track') {
        await matchingService.processFastTrackMatching(user._id);
        resultMsg = 'Fast Track matching triggered';
    } else if (type === 'star-matching') {
        await matchingService.processStarMatching(user._id);
        resultMsg = 'Star Matching triggered';
    } else {
        throw new ApiError(400, 'Invalid bonus type');
    }

    return res.status(200).json(
        new ApiResponse(200, {}, `${resultMsg} successfully`)
    );
});

/**
 * Get All User Wallets (Admin)
 */
export const getAllUserWallets = asyncHandler(async (req, res) => {
    // We need 'UserFinance' to get the wallet balances
    const UserFinance = (await import('../../models/UserFinance.model.js')).default;
    
    // Pagination parameters (optional, defaults provided)
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Fetch UserFinance records, sort by wallet.availableBalance DESC
    // Populate the user reference to get username, _id, memberId, and fullName
    const userFinances = await UserFinance.find()
        .sort({ 'wallet.availableBalance': -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('user', 'username memberId fullName')
        .lean();

    const total = await UserFinance.countDocuments();

    // Map the results into the flat structure requested by the user
    // "Username. UserId wallet balance ... jar wallet balance besi se top e thakbe"
    const walletData = userFinances.map(uf => ({
        userId: uf.user ? uf.user._id : null,
        memberId: uf.memberId || (uf.user ? uf.user.memberId : '—'),
        username: uf.user ? (uf.user.fullName || uf.user.username) : '—', // Fallback to username if fullName is empty
        walletBalance: uf.wallet ? uf.wallet.availableBalance : 0
    }));

    return res.status(200).json(
        new ApiResponse(200, {
            wallets: walletData,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        }, 'User wallets fetched successfully')
    );
});

/**
 * Get All User Wallet Logs Grouped By Day (Admin)
 */
export const getAllWalletLogs = asyncHandler(async (req, res) => {
    // Pagination (we paginate the raw logs, then group the page by date)
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Fetch all payouts (wallet transactions) globally, sorted newest first
    const logs = await Payout.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'username fullName memberId')
        .lean();

    const total = await Payout.countDocuments();

    // Grouping by Date (IST)
    const moment = (await import('moment-timezone')).default;
    const TIMEZONE = 'Asia/Kolkata';

    const groupedData = {};

    logs.forEach(log => {
        // Find the date for grouping (using createdAt)
        const dateStr = moment(log.createdAt).tz(TIMEZONE).format('YYYY-MM-DD');
        
        if (!groupedData[dateStr]) {
            groupedData[dateStr] = {
                date: dateStr,
                logs: []
            };
        }

        const user = log.userId || {};
        
        groupedData[dateStr].logs.push({
            userId: user._id || log.userId,
            memberId: user.memberId || log.memberId,
            username: user.fullName || user.username || '—',
            amount: log.netAmount,
            grossAmount: log.grossAmount,
            purpose: log.payoutType,
            status: log.status,
            time: moment(log.createdAt).tz(TIMEZONE).format('HH:mm:ss'),
            createdAt: log.createdAt
        });
    });

    // Convert object map into array and ensure sorting by date descending
    const resultList = Object.values(groupedData).sort((a, b) => {
        return moment(b.date).valueOf() - moment(a.date).valueOf();
    });

    return res.status(200).json(
        new ApiResponse(200, {
            groupedLogs: resultList,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        }, 'Global wallet logs fetched successfully')
    );
});

/**
 * Get Tree BV Summary for a specific user (Admin)
 */
export const getTreeBVSummary = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    
    // We already imported User at the top of the file
    const User = (await import('../../models/User.model.js')).default;
    const targetUser = await User.findOne({ memberId });
    if (!targetUser) throw new ApiError(404, 'User not found');

    const { treeBvService } = await import('../../services/business/treeBv.service.js');
    
    const summary = await treeBvService.getTreeBVSummary(targetUser._id);

    return res.status(200).json(
        new ApiResponse(200, summary, 'Tree BV Summary fetched successfully')
    );
});


