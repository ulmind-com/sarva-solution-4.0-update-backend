import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import FranchisePayout from '../../models/FranchisePayout.model.js';
import FranchiseBvState from '../../models/FranchiseBvState.model.js';
import MasterFranchiseRelation from '../../models/MasterFranchiseRelation.model.js';

/**
 * Get Franchise's Own Payout History
 * Excludes 'overridden' records (Master franchises get their real payout via Master Bonus Ledger)
 */
export const getMyPayouts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const franchiseId = req.franchise._id; // Extracted from franchise auth middleware

    const query = { franchiseId, status: { $ne: 'overridden' } };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const payouts = await FranchisePayout.find(query)
        .sort({ year: -1, month: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await FranchisePayout.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, {
            payouts,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        }, 'Your payout history fetched successfully')
    );
});

/**
 * Get Franchise's Live BV & PV State for this month
 * Dynamically applies Master (15% BV / ₹50 PV) or Normal (10% BV / ₹40 PV) rates.
 */
export const getMyLiveBv = asyncHandler(async (req, res) => {
    const franchiseId = req.franchise._id;

    // Check if this franchise is a Master
    const masterRelation = await MasterFranchiseRelation.findOne({ masterId: franchiseId, isActive: true }).lean();
    const isMaster = !!masterRelation;

    // Dynamic rates based on Master status
    const bvRate = isMaster ? 0.15 : 0.10;
    const pvRate = isMaster ? 50 : 40;

    // We use findOneAndUpdate to ensure the record exists safely, but we do not mutate it here
    const state = await FranchiseBvState.findOneAndUpdate(
        { franchiseId },
        { $setOnInsert: { currentMonthRepurchaseBv: 0, lifetimeRepurchaseBv: 0, currentMonthFirstPurchasePv: 0, lifetimeFirstPurchasePv: 0 } },
        { upsert: true, new: true }
    );

    // --- BV Estimates (Repurchase: dynamic rate) ---
    const generatedBv = state.currentMonthRepurchaseBv;
    const grossBvPayout = generatedBv * bvRate;
    const adminBvCharge = grossBvPayout * 0.05;
    const tdsBvCharge = grossBvPayout * 0.02;
    const netBvPayout = grossBvPayout - adminBvCharge - tdsBvCharge;

    // --- PV Estimates (1st Purchase: dynamic rate) ---
    const generatedPv = state.currentMonthFirstPurchasePv || 0;
    const grossPvPayout = generatedPv * pvRate;
    const adminPvCharge = grossPvPayout * 0.05;
    const tdsPvCharge = grossPvPayout * 0.02;
    const netPvPayout = grossPvPayout - adminPvCharge - tdsPvCharge;

    return res.status(200).json(
        new ApiResponse(200, {
            isMaster,
            bvRatePercent: isMaster ? 15 : 10,
            pvRateAmount: pvRate,
            // BV Data (Repurchase)
            currentMonthBv: state.currentMonthRepurchaseBv,
            lifetimeBv: state.lifetimeRepurchaseBv,
            liveEstimates: {
                estimatedGrossPayout: parseFloat(grossBvPayout.toFixed(2)),
                estimatedAdminCharge: parseFloat(adminBvCharge.toFixed(2)),
                estimatedTdsCharge: parseFloat(tdsBvCharge.toFixed(2)),
                estimatedNetPayout: parseFloat(netBvPayout.toFixed(2)),
                payoutCycle: 'Month-End'
            },
            // PV Data (1st Purchase)
            currentMonthPv: generatedPv,
            lifetimePv: state.lifetimeFirstPurchasePv || 0,
            pvEstimates: {
                ratePerPv: pvRate,
                estimatedGrossPayout: parseFloat(grossPvPayout.toFixed(2)),
                estimatedAdminCharge: parseFloat(adminPvCharge.toFixed(2)),
                estimatedTdsCharge: parseFloat(tdsPvCharge.toFixed(2)),
                estimatedNetPayout: parseFloat(netPvPayout.toFixed(2)),
                payoutCycle: 'Month-End'
            }
        }, 'Live BV & PV status fetched successfully')
    );
});

