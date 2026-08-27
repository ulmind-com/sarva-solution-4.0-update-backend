import mongoose from 'mongoose';
import FranchiseSale from '../../models/FranchiseSale.model.js';
import FranchiseInventory from '../../models/FranchiseInventory.model.js';
import Product from '../../models/Product.model.js';
import User from '../../models/User.model.js';
import Franchise from '../../models/Franchise.model.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { generateInvoicePDFBuffer } from '../../services/integration/pdf.service.js';
import { sendInvoiceEmailWithAttachment } from '../../services/integration/email.service.js';
import { uploadPDFToCloudinary } from '../../services/integration/cloudinary.service.js';

import UserFinance from '../../models/UserFinance.model.js';
import { selfRepurchaseService } from '../../services/business/selfRepurchase.service.js';
import { franchisePayoutService } from '../../services/business/franchisePayout.service.js';

/**
 * Get User by MemberId
 * @route GET /api/v1/franchise/sale/user/:memberId
 */
export const getUserByMemberId = asyncHandler(async (req, res) => {
    const { memberId } = req.params;

    const user = await User.findOne({ memberId })
        .select('memberId fullName email phone status personalPV totalPV isActive isFirstPurchaseDone');

    if (!user) {
        throw new ApiError(404, 'User not found with this Member ID');
    }

    const userObj = user.toObject();
    if (userObj.status === 'active') {
        userObj.isFirstPurchaseDone = true;
    }

    return res.status(200).json(
        new ApiResponse(200, userObj, 'User details fetched successfully')
    );
});

/**
 * Sell Products to User
 * @route POST /api/v1/franchise/sale/sell
 */
export const sellToUser = asyncHandler(async (req, res) => {
    const { memberId, items, paymentMethod = 'cash' } = req.body;

    // 1. Validate and get user
    const user = await User.findOne({ memberId });
    if (!user) {
        throw new ApiError(404, 'User not found with this Member ID');
    }

    // Check if this is first purchase (using explicit flag)
    // If the user's status is already active, it is NOT a first purchase (no PV/1 PV required, it's a repurchase).
    const isFirstPurchase = !user.isFirstPurchaseDone && user.status !== 'active';

    // Determine Tax Type (IGST or CGST+SGST)
    const franchise = await Franchise.findById(req.franchise._id);
    const franchiseState = franchise.shopAddress?.state || 'West Bengal';
    const userState = user.address?.state || 'West Bengal';
    const isInterState = franchiseState.toLowerCase().trim() !== userState.toLowerCase().trim();

    // 2. Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let subTotal = 0;
        let totalPV = 0;
        let totalBV = 0;
        let totalGstAmount = 0; // Accumulated Tax
        const processedItems = [];

        // 3. Process each item
        for (const item of items) {
            const product = await Product.findById(item.productId).session(session);
            if (!product) {
                throw new ApiError(404, `Product not found: ${item.productId}`);
            }

            // Check franchise inventory
            const franchiseStock = await FranchiseInventory.findOne({
                franchise: req.franchise._id,
                product: product._id
            }).session(session);

            if (!franchiseStock || franchiseStock.stockQuantity < item.quantity) {
                throw new ApiError(400, `Insufficient stock for ${product.productName}. Available: ${franchiseStock?.stockQuantity || 0}`);
            }

            // Calculate values based on purchase type
            let itemPV = 0;
            let itemBV = 0;

            if (isFirstPurchase) {
                itemPV = product.pv * item.quantity;
                itemBV = 0;
            } else {
                itemPV = 0;
                itemBV = product.bv * item.quantity;
            }

            const amount = product.price * item.quantity; // Taxable Value

            // Dynamic Tax Calculation (Per Item)
            const cgstRate = product.cgst || 0;
            const sgstRate = product.sgst || 0;
            let taxAmount = 0;

            // We store the product's defined rates (cgstRate, sgstRate) in the item 
            // regardless of transaction type, so we have a record of the % applied.
            // If Inter-state, we just sum them up for display.

            if (isInterState) {
                const totalRate = cgstRate + sgstRate;
                taxAmount = (amount * totalRate) / 100;
            } else {
                // Intra-State
                const cgstAmt = (amount * cgstRate) / 100;
                const sgstAmt = (amount * sgstRate) / 100;
                taxAmount = cgstAmt + sgstAmt;
            }

            totalPV += itemPV;
            totalBV += itemBV;
            subTotal += amount;
            totalGstAmount += taxAmount;

            // Deduct from franchise inventory
            franchiseStock.stockQuantity -= item.quantity;
            await franchiseStock.save({ session });

            processedItems.push({
                product: product._id,
                productId: product.productId,
                quantity: item.quantity,
                price: product.price,
                productDP: product.productDP,
                pv: product.pv,
                bv: product.bv,
                totalPV: itemPV,
                totalBV: itemBV,
                amount,
                hsnCode: product.hsnCode,
                // New Fields
                cgstRate: cgstRate, // Always store the source rates
                sgstRate: sgstRate,
                taxAmount: taxAmount,
                // For PDF convenience (computed on the fly usually, but passing here)
                cgstAmount: isInterState ? 0 : (amount * cgstRate) / 100,
                sgstAmount: isInterState ? 0 : (amount * sgstRate) / 100,
                igstAmount: isInterState ? taxAmount : 0
            });
        }

        // 4. Final Totals
        // Use accumulated GST amount instead of flat 18%
        // Calculate an "Average" GST rate for the record if needed, or just store amount.
        // The Schema has gstRate (default 18). We can set it to 0 or average?
        // Let's keep it as 0 or null if varying, but schema requires Number.
        // We will store 0 as it's item-wise now.
        const grandTotal = subTotal + totalGstAmount;

        // 5. Generate sale number
        const currentYear = new Date().getFullYear();
        const count = await FranchiseSale.countDocuments().session(session);
        const saleNo = `FS-${currentYear}-${String(count + 1).padStart(5, '0')}`;

        // 6. Validate Purchase Type and Determine Activation
        let willActivate = false;

        if (isFirstPurchase) {
            if (totalPV < 1) {
                throw new ApiError(400, 'First purchase must have at least 1 PV to activate the account and generate the bill.');
            }
            willActivate = (user.status === 'inactive');
        }

        // 7. Create sale record
        const sale = await FranchiseSale.create([{
            saleNo,
            saleDate: new Date(),
            franchise: req.franchise._id,
            user: user._id,
            memberId: user.memberId,
            items: processedItems, // Now contains tax breakups
            subTotal,
            gstRate: 0, // Mixed rates possible, so 0. Details in items.
            gstAmount: totalGstAmount,
            grandTotal,
            totalPV,
            totalBV,
            isFirstPurchase,
            userActivated: willActivate,
            paymentMethod,
            createdBy: req.franchise._id
        }], { session });

        // 8. Update user PV/BV based on purchase type
        const financeUpdate = {};

        if (isFirstPurchase) {
            user.personalPV += totalPV;
            user.totalPV += totalPV;
            user.thisMonthPV += totalPV;
            user.thisYearPV += totalPV;

            financeUpdate.personalPV = totalPV;
            financeUpdate.totalPV = totalPV;
            financeUpdate.thisMonthPV = totalPV;
            financeUpdate.thisYearPV = totalPV;

            user.isFirstPurchaseDone = true;
            user.activationDate = new Date();
        } else {
            user.personalBV += totalBV;
            user.totalBV += totalBV;
            user.thisMonthBV += totalBV;
            user.thisYearBV += totalBV;

            financeUpdate.personalBV = totalBV;
            financeUpdate.totalBV = totalBV;
            financeUpdate.thisMonthBV = totalBV;
            financeUpdate.thisYearBV = totalBV;

            // If user was already active but isFirstPurchaseDone was false, mark it as true now
            if (user.status === 'active' && !user.isFirstPurchaseDone) {
                user.isFirstPurchaseDone = true;
            }
        }

        await UserFinance.findOneAndUpdate(
            { user: user._id },
            {
                $inc: financeUpdate,
                $setOnInsert: { memberId: user.memberId }
            },
            { upsert: true, new: true, session }
        );

        // Hooks moved to post-commit phase

        // 9. ACTIVATION & GENERAL TREE PROPAGATION LOGIC
        let activationMessage = '';
        const mlmModule = await import('../../services/business/mlm.service.js');

        if (willActivate) {
            user.status = 'active';
            activationMessage = ' - User account activated!';
            await mlmModule.mlmService.handleUserActivation(user);
        }

        // ALWAYS propagate BV/PV up the binary tree for both first purchases and repurchases.
        // A major bug existed previously where repurchases silently never cascaded upwards here.
        if (totalBV > 0 || totalPV > 0) {
            await mlmModule.mlmService.propagateBVUpTree(
                user._id,
                user.position, // Leg orientation relative to immediate sponsor/parent
                totalBV || 0,
                isFirstPurchase ? 'first-purchase' : 'repurchase',
                `SALE-${sale[0].saleNo}`,
                totalPV || 0
            );
        }

        try {
            await user.save({ session });
        } catch (saveError) {
            console.error("============= SAVE USER FAILED IN SALE =============");
            console.error("Failing user ID:", user._id, user.memberId);
            if (saveError.errors && saveError.errors['kyc.status']) {
                console.error("KYC Status Validator Error details:", saveError.errors['kyc.status'].properties);
                console.error("KYC value:", JSON.stringify(user.kyc));
            }
            throw saveError;
        }

        // 11. Post-transaction: Generate PDF and send email
        let emailSent = false;
        let pdfCloudinaryUrl = null;
        let pdfPublicId = null;

        try {
            // Populate product names for PDF (Product ID used in processing)
            // processedItems already has most data. Need Name, HSN, Batch, Mrp from DB?
            // Actually, we fetched product inside loop. 
            // We need to re-fetch or map? 
            // Let's map `processedItems` and fetch Product names efficiently or reuse logic.
            // Wait, we pushed `processedItems` manually. It has product ID.
            // We can iterate processedItems and assume `product` is ObjectId.

            const populatedItems = await Promise.all(
                processedItems.map(async (item) => {
                    const product = await Product.findById(item.product);
                    return {
                        ...item,
                        productName: product.productName,
                        hsnCode: product.hsnCode,
                        batchNo: product.batchNo,
                        mrp: product.mrp,
                        rate: product.price, // Base rate
                        taxableValue: item.amount,
                        // Use calculated values
                        cgstRate: item.cgstRate,
                        sgstRate: item.sgstRate,
                        igstRate: item.cgstRate + item.sgstRate, // Derived
                        cgstAmount: item.cgstAmount,
                        sgstAmount: item.sgstAmount,
                        igstAmount: item.igstAmount
                    };
                })
            );

            // Calculate totals for PDF footer
            // We need breakdown of CGST/SGST/IGST totals
            let totalCGST = 0;
            let totalSGST = 0;
            let totalIGST = 0;

            populatedItems.forEach(item => {
                totalCGST += item.cgstAmount || 0;
                totalSGST += item.sgstAmount || 0;
                totalIGST += item.igstAmount || 0;
            });

            // Generate PDF
            const pdfBuffer = await generateInvoicePDFBuffer({
                details: {
                    invoiceNo: saleNo,
                    invoiceDate: new Date(),
                    reverseCharge: 'No',
                    transportMode: 'N/A',
                    vehicleNo: 'N/A'
                },
                sender: {
                    name: franchise.name,
                    shopName: franchise.shopName,
                    address: franchise.shopAddress?.street || '',
                    city: franchise.city,
                    state: franchiseState,
                    pincode: franchise.shopAddress?.pincode || '',
                    phone: franchise.phone,
                    gstin: '19ABRCS5991B1ZQ'
                },
                receiver: {
                    name: user.fullName,
                    fullAddress: user.address?.street || 'N/A',
                    city: user.address?.city || 'N/A',
                    state: userState,
                    pincode: user.address?.zipCode || 'N/A',
                    phone: user.phone,
                    gstin: 'N/A'
                },
                items: populatedItems,
                isFirstPurchase,
                totals: {
                    totalPV,
                    totalBV,
                    subTotal,
                    gstRate: 0, // Mixed
                    totalCGST,
                    totalSGST,
                    totalIGST,
                    grandTotal,
                    amountInWords: 'Rupees ...'
                }
            });

            // Upload PDF to Cloudinary
            try {
                const pdfUploadResult = await uploadPDFToCloudinary(
                    pdfBuffer,
                    'sarvasolution/invoices',
                    `invoice_${saleNo}`
                );
                pdfCloudinaryUrl = pdfUploadResult.url;
                pdfPublicId = pdfUploadResult.publicId;

                await FranchiseSale.findByIdAndUpdate(sale[0]._id, {
                    pdfUrl: pdfCloudinaryUrl,
                    pdfPublicId: pdfPublicId
                });

                console.log(`[PDF] Uploaded to Cloudinary: ${pdfCloudinaryUrl}`);
            } catch (pdfUploadError) {
                console.error('Error uploading PDF to Cloudinary:', pdfUploadError);
            }

            // Send email
            emailSent = await sendInvoiceEmailWithAttachment({
                email: user.email,
                franchiseName: user.fullName,
                invoiceNo: saleNo,
                date: new Date(),
                grandTotal,
                pdfBuffer,
                pdfFilename: `${saleNo}.pdf`
            });

        } catch (emailError) {
            console.error('Error sending invoice email:', emailError);
        }

        await session.commitTransaction();

        // ── SELF REPURCHASE BONUS HOOK (additive, non-fatal) ──────────────
        // Records BV for the monthly Self Repurchase Bonus pool.
        // Executed completely post-commit so it NEVER disrupts the sale flow.
        if (!isFirstPurchase && totalBV > 0) {
            try {
                await selfRepurchaseService.recordRepurchaseBV(
                    user._id,
                    user.memberId,
                    totalBV,
                    sale[0].saleNo
                );
            } catch (err) {
                console.error('[SRB] BV recording failed (non-fatal):', err.message);
            }

            // --- FRANCHISE REPURCHASE PAYOUT HOOK ---
            try {
                await franchisePayoutService.recordRepurchaseBV(
                    req.franchise._id,
                    totalBV
                );
            } catch (err) {
                console.error('[FranchisePayout] Failed to record BV:', err.message);
            }
        }

        // ── 1ST PURCHASE PV HOOK FOR FRANCHISE PAYOUT ───────────
        if (isFirstPurchase && totalPV > 0) {
            try {
                await franchisePayoutService.recordFirstPurchasePV(
                    req.franchise._id,
                    totalPV
                );
            } catch (err) {
                console.error('[FranchisePayout] Failed to record PV:', err.message);
            }
        }
        // ─────────────────────────────────────────────────────────────────

        return res.status(201).json(
            new ApiResponse(201, {
                sale: sale[0],
                userActivated: willActivate,
                isFirstPurchase,
                totalPV,
                totalBV,
                grandTotal,
                emailSent,
                pdfUrl: pdfCloudinaryUrl
            }, `Sale completed successfully${activationMessage}${emailSent ? ' - Invoice sent to user email' : ''}`)
        );

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Get Sales History for Franchise
 * @route GET /api/v1/franchise/sale/history
 */
export const getSalesHistory = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        sortBy = 'saleDate',
        sortOrder = 'desc'
    } = req.query;

    // Build query for franchise's sales only (no filters)
    const query = {
        franchise: req.franchise._id,
        deletedAt: null
    };

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query with population
    const sales = await FranchiseSale.find(query)
        .populate({
            path: 'user',
            select: 'memberId fullName email phone address status isFirstPurchaseDone personalPV totalPV personalBV totalBV'
        })
        .populate({
            path: 'items.product',
            select: 'productName productId hsnCode category'
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    // Get total count for pagination
    const totalCount = await FranchiseSale.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, {
            sales,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                totalCount,
                limit: parseInt(limit),
                hasNextPage: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
                hasPrevPage: parseInt(page) > 1
            }
        }, 'Sales history fetched successfully')
    );
});
