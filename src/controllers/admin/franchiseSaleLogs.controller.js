import FranchiseSale from '../../models/FranchiseSale.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import moment from 'moment-timezone';

/**
 * Get all franchise sale logs, date-wise grouped.
 * Supports pagination, franchise filter, and date range filter.
 * 
 * @route GET /api/v1/admin/franchise-sale-logs
 * @query page, limit, franchiseId, startDate, endDate
 */
export const getFranchiseSaleLogs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, franchiseId, startDate, endDate } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build match query
    const matchQuery = { deletedAt: null };

    if (franchiseId) {
        const mongoose = await import('mongoose');
        matchQuery.franchise = new mongoose.default.Types.ObjectId(franchiseId);
    }

    if (startDate || endDate) {
        matchQuery.saleDate = {};
        if (startDate) matchQuery.saleDate.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchQuery.saleDate.$lte = end;
        }
    }

    // Get total count first
    const total = await FranchiseSale.countDocuments(matchQuery);

    // Fetch sales with pagination
    const sales = await FranchiseSale.find(matchQuery)
        .populate('franchise', 'name shopName vendorId city')
        .populate('user', 'fullName memberId')
        .populate('items.product', 'productName productId')
        .sort({ saleDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    // Group sales by date (IST)
    const dateMap = {};

    for (const sale of sales) {
        const dateKey = moment(sale.saleDate).tz('Asia/Kolkata').format('YYYY-MM-DD');

        if (!dateMap[dateKey]) {
            dateMap[dateKey] = [];
        }

        dateMap[dateKey].push({
            _id: sale._id,
            saleNo: sale.saleNo,
            time: moment(sale.saleDate).tz('Asia/Kolkata').format('HH:mm:ss'),
            // Franchise Info
            franchiseName: sale.franchise?.shopName || sale.franchise?.name || 'Unknown',
            franchiseVendorId: sale.franchise?.vendorId || '-',
            franchiseCity: sale.franchise?.city || '-',
            // User Info
            userName: sale.user?.fullName || 'Unknown User',
            memberId: sale.memberId || sale.user?.memberId || '-',
            // Items
            items: (sale.items || []).map(item => ({
                productName: item.product?.productName || 'Unknown',
                productId: item.product?.productId || item.productId || '-',
                quantity: item.quantity,
                price: item.price,
                amount: item.amount,
                bv: item.bv || 0,
                pv: item.pv || 0,
                totalBV: item.totalBV || 0,
                totalPV: item.totalPV || 0,
            })),
            // Totals
            itemCount: (sale.items || []).length,
            totalQuantity: (sale.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0),
            subTotal: sale.subTotal || 0,
            gstAmount: sale.gstAmount || 0,
            grandTotal: sale.grandTotal || 0,
            totalBV: sale.totalBV || 0,
            totalPV: sale.totalPV || 0,
            // Purchase Type
            isFirstPurchase: sale.isFirstPurchase || false,
            paymentMethod: sale.paymentMethod || 'cash',
            paymentStatus: sale.paymentStatus || 'paid',
        });
    }

    // Convert to sorted array
    const groupedLogs = Object.keys(dateMap)
        .sort((a, b) => new Date(b) - new Date(a))
        .map(date => ({
            date,
            sales: dateMap[date],
            count: dateMap[date].length,
            dayTotal: dateMap[date].reduce((sum, s) => sum + s.grandTotal, 0),
        }));

    return res.status(200).json(
        new ApiResponse(200, {
            groupedLogs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit)),
            }
        }, 'Franchise sale logs fetched successfully')
    );
});
