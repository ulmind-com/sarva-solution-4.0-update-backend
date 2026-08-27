import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import FranchisePayout from '../../models/FranchisePayout.model.js';
import FranchiseBvState from '../../models/FranchiseBvState.model.js';
import MasterFranchiseRelation from '../../models/MasterFranchiseRelation.model.js';

/**
 * Get Paginated List of Franchise Payouts (Monthly Audit)
 */
export const getFranchisePayouts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, month, year, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    // If search by franchise vendorId or name, we need to populate or lookup
    let matchQuery = { ...query };

    // Since we need to support search by franchise details, we use aggregation
    const pipeline = [
        { $match: matchQuery },
        {
            $lookup: {
                from: 'franchises',
                localField: 'franchiseId',
                foreignField: '_id',
                as: 'franchise'
            }
        },
        { $unwind: { path: '$franchise', preserveNullAndEmptyArrays: true } }
    ];

    if (search) {
        pipeline.push({
            $match: {
                $or: [
                    { 'franchise.vendorId': { $regex: search, $options: 'i' } },
                    { 'franchise.name': { $regex: search, $options: 'i' } },
                    { 'franchise.shopName': { $regex: search, $options: 'i' } }
                ]
            }
        });
    }

    // Sorting & Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $sort: { createdAt: -1 } });
    
    // Facet for total count and paginated data
    pipeline.push({
        $facet: {
            metadata: [{ $count: 'total' }],
            data: [
                { $skip: skip },
                { $limit: parseInt(limit) },
                {
                    $project: {
                        'franchise.password': 0,
                        'franchise.shopAddress': 0
                    }
                }
            ]
        }
    });

    const result = await FranchisePayout.aggregate(pipeline);
    
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
    const payouts = result[0].data;

    return res.status(200).json(
        new ApiResponse(200, {
            payouts,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        }, 'Franchise payouts fetched successfully')
    );
});

/**
 * Mark a generated Payout as Paid (Manual Admin Action)
 */
export const markPayoutPaid = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { transactionRef } = req.body;

    const payout = await FranchisePayout.findById(id);
    if (!payout) throw new ApiError(404, 'Franchise payout record not found');

    if (payout.status === 'paid') {
        throw new ApiError(400, 'Payout is already marked as paid');
    }

    payout.status = 'paid';
    payout.paidAt = new Date();
    payout.transactionRef = transactionRef || null;
    payout.paidByAdminId = req.user._id;

    await payout.save();

    return res.status(200).json(
        new ApiResponse(200, payout, 'Franchise payout marked as paid successfully')
    );
});

/**
 * Get Live BV/PV Accumulation States for all Franchises
 * Now enriched with isMaster flag so the frontend can dynamically show correct rates.
 */
export const getLiveFranchiseBvStates = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, hasBvOnly } = req.query;

    const query = {};
    if (hasBvOnly === 'true') {
        query.$or = [
            { currentMonthRepurchaseBv: { $gt: 0 } },
            { currentMonthFirstPurchasePv: { $gt: 0 } }
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const states = await FranchiseBvState.find(query)
        .populate('franchiseId', 'vendorId name shopName email phone')
        .sort({ currentMonthRepurchaseBv: -1, currentMonthFirstPurchasePv: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await FranchiseBvState.countDocuments(query);

    // Enrich each state with isMaster flag
    const masterRelations = await MasterFranchiseRelation.find({ isActive: true }).select('masterId').lean();
    const masterIdSet = new Set(masterRelations.map(r => r.masterId.toString()));

    const enrichedStates = states.map(s => {
        const stateObj = s.toObject();
        const fId = stateObj.franchiseId?._id?.toString() || stateObj.franchiseId?.toString();
        stateObj.isMaster = masterIdSet.has(fId);
        return stateObj;
    });

    return res.status(200).json(
        new ApiResponse(200, {
            states: enrichedStates,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        }, 'Live Franchise BV states fetched successfully')
    );
});

