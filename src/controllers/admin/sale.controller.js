import mongoose from 'mongoose';
import Invoice from '../../models/Invoice.model.js';
import Franchise from '../../models/Franchise.model.js';
import { processSaleTransaction, handlePostSaleActions } from '../../services/business/sales.service.js'; // Shared Service
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * @desc    Admin sells products to Franchise
 * @route   POST /api/v1/admin/sales/sell-to-franchise
 * @access  Admin
 */
export const sellToFranchise = asyncHandler(async (req, res) => {
    const { franchiseId, invoiceDate, items } = req.body;

    // Start Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    let transactionResult = null;
    let franchise = null;

    try {
        // 1. Validate Franchise
        franchise = await Franchise.findOne({ vendorId: franchiseId }).session(session);
        if (!franchise) throw new ApiError(404, 'Franchise not found');
        if (franchise.isBlocked) throw new ApiError(400, 'Franchise is blocked');

        // 2. Process Sale (Shared Logic)
        transactionResult = await processSaleTransaction({
            items,
            franchise,
            invoiceDate,
            session,
            user: req.user
        });

        // Commit DB changes
        await session.commitTransaction();

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }

    // 3. Post-Transaction (PDF & Email)
    let emailSent = false;
    if (transactionResult) {
        emailSent = await handlePostSaleActions(
            transactionResult.invoice,
            transactionResult.processedItems,
            franchise
        );
    }

    return res.status(201).json(
        new ApiResponse(201, {
            invoice: transactionResult.invoice,
            emailSent
        }, 'Sale processed successfully')
    );
});

/**
 * @desc    Get Sales History
 * @route   GET /api/v1/admin/sales/list
 */
export const getSalesHistory = asyncHandler(async (req, res) => {
    const {
        page = 1, limit = 20,
        franchiseId, invoiceNo, status
    } = req.query;

    const query = {};
    if (franchiseId) query.franchise = franchiseId;
    if (invoiceNo) query.invoiceNo = invoiceNo;
    if (status) query.status = status;

    const invoices = await Invoice.find(query)
        .populate('franchise', 'name shopName vendorId')
        .sort({ invoiceDate: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Invoice.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, {
            invoices,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit),
                totalInvoices: total
            }
        }, 'Sales history fetched')
    );
});
