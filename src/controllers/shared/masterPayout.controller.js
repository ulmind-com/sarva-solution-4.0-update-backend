import MasterFranchisePayout from '../../models/MasterFranchisePayout.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Admin: Get all Master Franchise Differential/Override Payouts
 * @route GET /api/v1/admin/master-payouts
 */
export const getAdminMasterPayouts = asyncHandler(async (req, res) => {
    const { month, year, status } = req.query;

    const query = {};
    if (month && year) {
        query.month = Number(month);
        query.year = Number(year);
    }
    if (status && status !== 'All') {
        query.status = status.toLowerCase();
    }

    const payouts = await MasterFranchisePayout.find(query)
        .populate('masterId', 'name shopName vendorId phone')
        .populate('sourceFranchiseId', 'name shopName vendorId')
        .sort({ year: -1, month: -1, createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, payouts, 'Master payouts fetched successfully')
    );
});

/**
 * Admin: Mark a Master Payout as Paid
 * @route PATCH /api/v1/admin/master-payouts/:payoutId/mark-paid
 */
export const markMasterPayoutPaid = asyncHandler(async (req, res) => {
    const { payoutId } = req.params;
    const { transactionId, paymentNotes } = req.body;

    const payout = await MasterFranchisePayout.findById(payoutId);
    if (!payout) {
        throw new ApiError(404, 'Payout record not found');
    }

    if (payout.status === 'paid') {
        throw new ApiError(400, 'Payout is already marked as paid');
    }

    payout.status = 'paid';
    payout.paidAt = new Date();
    payout.transactionId = transactionId || null;
    payout.paymentNotes = paymentNotes || '';
    payout.approvedBy = req.user._id;

    await payout.save();

    return res.status(200).json(
        new ApiResponse(200, payout, 'Payout successfully marked as paid')
    );
});

/**
 * Franchise: Get My Master Payouts
 * @route GET /api/v1/franchise/master-payouts
 */
export const getMyMasterPayouts = asyncHandler(async (req, res) => {
    const masterId = req.franchise._id;
    const { month, year } = req.query;

    const query = { masterId };
    if (month && year) {
        query.month = Number(month);
        query.year = Number(year);
    }

    const payouts = await MasterFranchisePayout.find(query)
        .populate('sourceFranchiseId', 'name shopName vendorId')
        .sort({ year: -1, month: -1, createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, payouts, 'My Master payouts fetched successfully')
    );
});
