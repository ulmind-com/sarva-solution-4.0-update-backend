import FranchiseSale from '../../models/FranchiseSale.model.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * Get the logged-in user's purchase history
 * @route GET /api/v1/user/purchases
 */
export const getMyPurchases = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
        user: req.user._id,
        deletedAt: null
    };

    const [purchases, totalCount] = await Promise.all([
        FranchiseSale.find(query)
            .populate({
                path: 'franchise',
                select: 'name shopName vendorId city'
            })
            .populate({
                path: 'items.product',
                select: 'productName productId productImage hsnCode category'
            })
            .sort({ saleDate: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        FranchiseSale.countDocuments(query)
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            purchases,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                totalCount,
                limit: parseInt(limit),
                hasNextPage: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
                hasPrevPage: parseInt(page) > 1
            }
        }, 'Purchase history fetched successfully')
    );
});
