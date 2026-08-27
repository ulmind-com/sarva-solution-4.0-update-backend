import mongoose from 'mongoose';
import ProductRequest from '../../models/ProductRequest.model.js';
import { processSaleTransaction, handlePostSaleActions } from '../../services/business/sales.service.js';
import { sendStatusEmail } from '../../services/integration/email.service.js'; // Assuming we add a new email helper for requests
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * @desc    List All Requests (Admin)
 * @route   GET /api/v1/admin/product-requests
 */
export const getAllRequests = asyncHandler(async (req, res) => {
    const {
        page = 1, limit = 20,
        status, franchiseId, search
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (franchiseId) query.franchise = franchiseId;
    // Search by Request No would need Regex or exact
    if (search) query.requestNo = { $regex: search, $options: 'i' };

    const requests = await ProductRequest.find(query)
        .populate('franchise', 'name shopName vendorId city mobile')
        .populate('items.product', '_id productId productName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await ProductRequest.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, {
            requests,
            pagination: { total, currentPage: Number(page) }
        }, 'Requests fetched')
    );
});

/**
 * @desc    Approve Request
 * @route   PATCH /api/v1/admin/product-request/:requestId/approve
 */
export const approveRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { approvedQuantities, notes } = req.body;
    // approvedQuantities: { "productId": 10 } map to override defaults

    // Start Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    let transactionResult = null;
    let request = null;

    try {
        request = await ProductRequest.findById(requestId)
            .populate('franchise')
            .session(session);

        if (!request) throw new ApiError(404, 'Request not found');
        if (request.status !== 'pending') throw new ApiError(400, `Request is already ${request.status}`);

        // Construct items list for Sales Logic
        // Map request items to the format { productId, quantity }
        // Use approvedQty if provided, else requestedQty
        const salesItems = [];

        for (const item of request.items) {
            const pid = item.product.toString();
            let qty = item.requestedQuantity;

            // Override if admin specified
            if (approvedQuantities && approvedQuantities[pid] !== undefined) {
                qty = Number(approvedQuantities[pid]);
            }

            if (qty > 0) {
                salesItems.push({ productId: pid, quantity: qty });
                item.approvedQuantity = qty; // Update request doc
            } else {
                item.approvedQuantity = 0;
            }
        }

        if (salesItems.length === 0) {
            throw new ApiError(400, 'Cannot approve request with 0 quantities');
        }

        // TRIGGER SALES LOGIC
        transactionResult = await processSaleTransaction({
            items: salesItems,
            franchise: request.franchise,
            invoiceDate: new Date(),
            session,
            user: req.user
        });

        // Update Request Status
        request.status = 'approved';
        request.approvedBy = req.user._id;
        request.approvedAt = new Date();
        request.notes = notes;
        request.invoiceId = transactionResult.invoice._id;

        await request.save({ session });

        await session.commitTransaction();

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }

    // Post-Transaction
    if (transactionResult) {
        await handlePostSaleActions(
            transactionResult.invoice,
            transactionResult.processedItems,
            request.franchise
        );
        // Maybe send specific "Request Approved" email distinct from "Invoice Sent"?
        // For now, Invoice Email implicitly confirms approval.
    }

    return res.status(200).json(
        new ApiResponse(200, { request, invoice: transactionResult.invoice }, 'Request approved & processed')
    );
});

/**
 * @desc    Reject Request
 * @route   PATCH /api/v1/admin/product-request/:requestId/reject
 */
export const rejectRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { rejectionReason } = req.body;

    const request = await ProductRequest.findById(requestId);
    if (!request) throw new ApiError(404, 'Request not found');
    if (request.status !== 'pending') throw new ApiError(400, `Request is already ${request.status}`);

    request.status = 'rejected';
    request.rejectionReason = rejectionReason;
    request.approvedBy = req.user._id; // Rejected by
    request.approvedAt = new Date(); // Rejection Date

    await request.save();

    // TODO: Send Rejection Email via email.service

    return res.status(200).json(
        new ApiResponse(200, { request }, 'Request rejected')
    );
});
