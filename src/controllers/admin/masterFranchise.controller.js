import MasterFranchiseRelation from '../../models/MasterFranchiseRelation.model.js';
import Franchise from '../../models/Franchise.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { getLiveProjectedEarnings } from '../../services/business/masterPayout.service.js';

/**
 * Assign a Master Franchise status to an existing franchise and map sub-franchises
 * @route POST /api/v1/admin/master-franchises
 */
export const assignMasterFranchise = asyncHandler(async (req, res) => {
    const { masterId, subFranchises = [] } = req.body;

    if (!masterId) {
        throw new ApiError(400, 'masterId is required');
    }

    // Verify Master Franchise exists
    const masterExists = await Franchise.findById(masterId);
    if (!masterExists) {
        throw new ApiError(404, 'The franchise selected as Master was not found');
    }

    // Validate subFranchises
    if (subFranchises.length > 0) {
        const validSubs = await Franchise.find({ _id: { $in: subFranchises } });
        if (validSubs.length !== subFranchises.length) {
            throw new ApiError(400, 'One or more selected sub-franchises are invalid');
        }
        
        // Prevent a master from being its own sub
        if (subFranchises.includes(masterId)) {
            throw new ApiError(400, 'A master franchise cannot be its own sub-franchise');
        }
    }

    // Upsert Master Relation
    const relation = await MasterFranchiseRelation.findOneAndUpdate(
        { masterId },
        {
            $set: {
                subFranchises,
                isActive: true,
                assignedBy: req.user._id // Assuming admin is calling this
            }
        },
        { new: true, upsert: true }
    ).populate('masterId', 'name shopName vendorId').populate('subFranchises', 'name shopName vendorId');

    return res.status(200).json(
        new ApiResponse(200, relation, 'Master Franchise assigned successfully')
    );
});

/**
 * Get all Master Franchises and their sub-networks
 * @route GET /api/v1/admin/master-franchises
 */
export const getMasterFranchiseList = asyncHandler(async (req, res) => {
    const masters = await MasterFranchiseRelation.find({ isActive: true })
        .populate('masterId', 'name shopName vendorId city phone email status isBlocked createdAt')
        .populate('subFranchises', 'name shopName vendorId city status isBlocked')
        .populate('pendingSubFranchises', 'name shopName vendorId city status isBlocked')
        .sort({ createdAt: -1 });

    // Format response to be cleanly readable
    const formatted = masters.map(m => ({
        _id: m._id,
        master: m.masterId,
        subFranchiseCount: m.subFranchises.length,
        subFranchises: m.subFranchises,
        pendingSubFranchises: m.pendingSubFranchises || [],
        assignedAt: m.createdAt
    })).filter(m => m.master != null); // filter out deleted franchises if any edge cases

    return res.status(200).json(
        new ApiResponse(200, formatted, 'Master Franchises fetched successfully')
    );
});

/**
 * Remove Master status from a franchise
 * @route DELETE /api/v1/admin/master-franchises/:relationId
 */
export const removeMasterFranchise = asyncHandler(async (req, res) => {
    const { relationId } = req.params;

    const relation = await MasterFranchiseRelation.findById(relationId);
    if (!relation) {
        throw new ApiError(404, 'Master relation not found');
    }

    // Soft delete or hard delete. Since it's purely relational, hard delete is safe.
    await MasterFranchiseRelation.findByIdAndDelete(relationId);

    return res.status(200).json(
        new ApiResponse(200, null, 'Master Franchise privileges removed successfully')
    );
});

/**
 * Fetch available franchises to be assigned as master/sub
 * EXCLUDES franchises that are already a master.
 */
export const getAvailableFranchises = asyncHandler(async (req, res) => {
    // Find all existing masters to exclude them from being selected as subs
    const existingRelations = await MasterFranchiseRelation.find({ isActive: true }).select('masterId');
    const existingMasterIds = existingRelations.map(r => r.masterId);

    const franchises = await Franchise.find({ 
        isBlocked: false,
        _id: { $nin: existingMasterIds }
    }).select('name shopName vendorId city').sort({ createdAt: -1 });

    // Get ALL active franchises just for the Master selection dropdown
    const allActive = await Franchise.find({ isBlocked: false }).select('name shopName vendorId city');

    return res.status(200).json(
        new ApiResponse(200, {
            eligibleForMaster: allActive,
            eligibleForSub: franchises
        }, 'Eligible franchise list fetched')
    );
});

/**
 * Get Live MTD Earnings Projection for a specific Master Franchise
 * @route GET /api/v1/admin/master-franchises/:masterId/live-earnings
 */
export const getLiveEarnings = asyncHandler(async (req, res) => {
    const { masterId } = req.params;
    if (!masterId) {
        throw new ApiError(400, 'Master ID is required');
    }

    const liveData = await getLiveProjectedEarnings(masterId);

    return res.status(200).json(
        new ApiResponse(200, liveData, 'Live projected earnings calculated for Admin')
    );
});

/**
 * Fetch all pending Sub-Franchise link requests for a specific Master Franchise
 * @route GET /api/v1/admin/master-franchises/:masterId/pending-requests
 */
export const getPendingNetworkRequests = asyncHandler(async (req, res) => {
    const { masterId } = req.params;

    const relation = await MasterFranchiseRelation.findOne({ masterId, isActive: true })
        .populate('pendingSubFranchises', 'name shopName vendorId city phone email status createdAt_IST');

    if (!relation) {
        throw new ApiError(404, 'Active Master Franchise not found');
    }

    return res.status(200).json(
        new ApiResponse(200, relation.pendingSubFranchises || [], 'Pending link requests fetched successfully')
    );
});

/**
 * Approve a pending Sub-Franchise link request
 * @route PUT /api/v1/admin/master-franchises/:masterId/approve-request/:subId
 */
export const approveNetworkRequest = asyncHandler(async (req, res) => {
    const { masterId, subId } = req.params;

    const relation = await MasterFranchiseRelation.findOne({ masterId, isActive: true });
    if (!relation) throw new ApiError(404, 'Master Franchise not found');

    // Check if it's actually in the pending list
    const isPending = relation.pendingSubFranchises.includes(subId);
    if (!isPending) {
        throw new ApiError(404, 'This sub-franchise is not in the pending requests list');
    }

    // Move from pending array to active array
    relation.pendingSubFranchises = relation.pendingSubFranchises.filter(id => id.toString() !== subId);
    if (!relation.subFranchises.includes(subId)) {
        relation.subFranchises.push(subId);
    }
    await relation.save();

    return res.status(200).json(
        new ApiResponse(200, null, 'Sub-Franchise officially linked to Master Network')
    );
});

/**
 * Reject a pending Sub-Franchise link request
 * @route DELETE /api/v1/admin/master-franchises/:masterId/reject-request/:subId
 */
export const rejectNetworkRequest = asyncHandler(async (req, res) => {
    const { masterId, subId } = req.params;

    const relation = await MasterFranchiseRelation.findOne({ masterId, isActive: true });
    if (!relation) throw new ApiError(404, 'Master Franchise not found');

    const isPending = relation.pendingSubFranchises.includes(subId);
    if (!isPending) {
        throw new ApiError(404, 'This sub-franchise is not in the pending requests list');
    }

    // Just remove from pending array
    relation.pendingSubFranchises = relation.pendingSubFranchises.filter(id => id.toString() !== subId);
    await relation.save();

    return res.status(200).json(
        new ApiResponse(200, null, 'Sub-Franchise link request rejected and cleared')
    );
});
