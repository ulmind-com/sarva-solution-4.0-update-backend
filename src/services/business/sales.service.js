import Invoice from '../../models/Invoice.model.js';
import FranchiseInventory from '../../models/FranchiseInventory.model.js';
import StockTransaction from '../../models/StockTransaction.model.js';
import Product from '../../models/Product.model.js';
import { generateInvoicePDFBuffer } from '../integration/pdf.service.js';
import { sendInvoiceEmailWithAttachment } from '../integration/email.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { getISTDate, getISTMoment } from '../../utils/date.util.js';

/**
 * Process a Sales Transaction (Atomic)
 * Use this for both Direct Sales and Request Approvals
 * 
 * @param {Object} params
 * @param {Array} params.items - Array of { productId, quantity } (For approvals, these are Approved Quantities)
 * @param {Object} params.franchise - Populated Franchise Document
 * @param {Date} params.invoiceDate
 * @param {Object} params.session - Mongoose Session
 * @param {Object} params.user - Admin User triggering the sale
 * @returns {Object} { invoice, pdfUrl }
 */
export const processSaleTransaction = async ({
    items,
    franchise,
    invoiceDate,
    session,
    user
}) => {
    const processedItems = [];
    let subTotal = 0; // This will be Total Taxable Value

    // Tax Totals
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalTaxAmount = 0;

    // Determine Admin State (Fixed) and Franchise State
    const adminState = 'West Bengal';
    const franchiseState = franchise.shopAddress?.state || franchise.state || '';
    const isInterState = adminState.toLowerCase() !== franchiseState.toLowerCase();

    for (const item of items) {
        const product = await Product.findById(item.productId).session(session);
        if (!product || !product.isActive) {
            throw new ApiError(400, `Product not found or inactive: ${item.productId}`);
        }

        if (product.stockQuantity < item.quantity) {
            throw new ApiError(400, `Insufficient stock for ${product.productName}. Available: ${product.stockQuantity}`);
        }

        // --- Pricing & Tax Calculation ---
        const taxableValue = item.quantity * product.price; // DP is Taxable Value
        subTotal += taxableValue;

        // Fetch Tax Rates from Product
        const cgstRate = product.cgst || 0;
        const sgstRate = product.sgst || 0;
        // If product doesn't have explicit IGST, we can derive or assume standard (CGST+SGST)
        // Usually IGST = CGST + SGST
        const productIgstRate = (product.cgst || 0) + (product.sgst || 0);

        let itemCGST = 0;
        let itemSGST = 0;
        let itemIGST = 0;
        let itemTaxAmount = 0;

        if (isInterState) {
            // Inter-state: Charge IGST only
            itemIGST = (taxableValue * productIgstRate) / 100;
            itemTaxAmount = itemIGST;
        } else {
            // Intra-state: Charge CGST + SGST
            itemCGST = (taxableValue * cgstRate) / 100;
            itemSGST = (taxableValue * sgstRate) / 100;
            itemTaxAmount = itemCGST + itemSGST;
        }

        // Add to Global Totals
        totalCGST += itemCGST;
        totalSGST += itemSGST;
        totalIGST += itemIGST;
        totalTaxAmount += itemTaxAmount;

        processedItems.push({
            product: product._id,
            quantity: item.quantity,
            productDP: product.price,
            productMRP: product.mrp,
            amount: taxableValue + itemTaxAmount, // Item Total Amount (Price + Tax)

            // Detailed Breakdown
            taxableValue: taxableValue,
            cgstRate: isInterState ? 0 : cgstRate,
            sgstRate: isInterState ? 0 : sgstRate,
            igstRate: isInterState ? productIgstRate : 0,

            taxAmount: itemTaxAmount,
            cgstAmount: itemCGST,
            sgstAmount: itemSGST,
            igstAmount: itemIGST,

            hsnCode: product.hsnCode,
            batchNo: product.batchNo,
            productName: product.productName, // Renaming key for PDF consistency 'name' vs 'productName'
            name: product.productName // Keeping both for compatibility
        });

        // 1. Deduct Main Inventory
        product.stockQuantity -= Number(item.quantity);
        await product.save({ session });

        // 2. Log Main Stock Transaction
        await StockTransaction.create([{
            product: product._id,
            transactionType: 'franchise_sale',
            quantity: Number(item.quantity),
            previousStock: product.stockQuantity + Number(item.quantity),
            newStock: product.stockQuantity,
            reason: `Sold to franchise ${franchise.vendorId}`,
            referenceNo: 'PENDING-INV',
            franchise: franchise._id,
            performedBy: user._id
        }], { session });

        // 3. Add to Franchise Inventory
        const existingStock = await FranchiseInventory.findOne({
            franchise: franchise._id,
            product: product._id
        }).session(session);

        if (existingStock) {
            existingStock.stockQuantity += Number(item.quantity);
            existingStock.updatedAt = getISTDate();
            await existingStock.save({ session });
        } else {
            await FranchiseInventory.create([{
                franchise: franchise._id,
                product: product._id,
                stockQuantity: Number(item.quantity),
                purchasePrice: product.price,
                batchNo: product.batchNo,
                createdBy: user._id
            }], { session });
        }

        // Log Franchise Purchase
        await StockTransaction.create([{
            product: product._id,
            franchise: franchise._id,
            transactionType: 'franchise_purchase',
            quantity: Number(item.quantity),
            previousStock: existingStock ? existingStock.stockQuantity - Number(item.quantity) : 0,
            newStock: existingStock ? existingStock.stockQuantity : Number(item.quantity),
            reason: 'Stock received from Admin',
            performedBy: user._id
        }], { session });
    }

    // 4. Generate Invoice No
    const currentYear = getISTMoment().year();
    const count = await Invoice.countDocuments().session(session);
    const invoiceNo = `INV-${currentYear}-${String(count + 1).padStart(5, '0')}`;

    // 5. Final Totals
    const grandTotal = subTotal + totalTaxAmount;

    // 6. Create Invoice
    const invoice = await Invoice.create([{
        invoiceNo,
        invoiceDate: invoiceDate || getISTDate(),
        franchise: franchise._id,
        items: processedItems,

        // Financials
        subTotal, // Taxable Value
        totalTaxableValue: subTotal,
        gstRate: 0, // Mixed rates, set 0
        gstAmount: totalTaxAmount,

        totalCGST,
        totalSGST,
        totalIGST,
        grandTotal,

        deliveryAddress: {
            franchiseName: franchise.name,
            shopName: franchise.shopName,
            fullAddress: `${franchise.shopAddress.street}, ${franchise.shopAddress.landmark || ''}`,
            city: franchise.city,
            state: franchise.shopAddress.state,
            pincode: franchise.shopAddress.pincode
        },
        createdBy: user._id,
        status: 'paid',
        paymentStatus: 'paid',
        paidAmount: grandTotal,
        paymentDate: getISTDate()
    }], { session });

    return {
        invoice: invoice[0],
        processedItems,
        grandTotal,
        totals: { // Returning a 'totals' object for easy PDF consumption
            totalPV: 0,
            totalBV: 0,
            totalCGST,
            totalSGST,
            totalIGST,
            grandTotal
        }
    };
};

/**
 * Handle Post-Transaction Logic (PDF, Email)
 * Call this AFTER committing the transaction
 */
export const handlePostSaleActions = async (invoice, processedItems, franchise) => {
    try {
        const invoiceDataForPdf = {
            details: {
                invoiceNo: invoice.invoiceNo,
                invoiceDate: invoice.invoiceDate,
                // Add transport info if available
            },
            sender: {
                name: 'Sarva Solution',
                address: 'Head Office Address', // Update with actual HO address if available
                city: 'Kolkata',
                state: 'West Bengal',
                phone: '9832775700', // Admin Phone
                gstin: 'DEFAULTGSTIN' // Update if available in env or constant
            },
            receiver: {
                name: franchise.name,
                fullAddress: `${franchise.shopAddress.street}, ${franchise.shopAddress.landmark}`,
                city: franchise.city,
                state: franchise.shopAddress?.state || franchise.state,
                pincode: franchise.shopAddress.pincode,
                phone: franchise.mobile
            },
            items: processedItems,
            totals: {
                subTotal: invoice.subTotal, // Taxable Value
                totalCGST: invoice.totalCGST || 0,
                totalSGST: invoice.totalSGST || 0,
                totalIGST: invoice.totalIGST || 0,
                grandTotal: invoice.grandTotal,
                totalBV: 0 // Admin Sale
            }
        };

        // Generate PDF Buffer (no Cloudinary upload)
        const pdfBuffer = await generateInvoicePDFBuffer(invoiceDataForPdf);

        // Send Email with PDF attachment
        const emailSent = await sendInvoiceEmailWithAttachment({
            email: franchise.email,
            franchiseName: franchise.name,
            invoiceNo: invoice.invoiceNo,
            date: invoice.invoiceDate,
            grandTotal: invoice.grandTotal,
            pdfBuffer,
            pdfFilename: `${invoice.invoiceNo}.pdf`
        });

        // Update invoice email status
        await Invoice.findByIdAndUpdate(invoice._id, { emailSent });

        return emailSent;

    } catch (error) {
        console.error('Post-Sale Action Error (PDF/Email):', error);
        return false; // Don't crash flow if email fails
    }
};
