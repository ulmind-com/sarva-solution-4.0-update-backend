import FranchiseInventory from '../../models/FranchiseInventory.model.js';
import Franchise from '../../models/Franchise.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Get inventory for a specific franchise (Admin View)
 * @route GET /api/v1/admin/franchise-inventory/:franchiseId
 */
export const getFranchiseInventory = asyncHandler(async (req, res) => {
    const { franchiseId } = req.params;

    // Verify franchise exists
    const franchise = await Franchise.findById(franchiseId).select('name shopName vendorId city phone email');
    if (!franchise) {
        throw new ApiError(404, 'Franchise not found');
    }

    // Fetch all inventory items for this franchise, populate product details
    const inventory = await FranchiseInventory.find({ franchise: franchiseId })
        .populate('product', 'productName productId category price mrp bv pv hsnCode')
        .sort({ updatedAt: -1 })
        .lean();

    // Calculate summary
    const totalProducts = inventory.length;
    const totalStock = inventory.reduce((sum, item) => sum + (item.stockQuantity || 0), 0);
    const totalValue = inventory.reduce((sum, item) => sum + ((item.stockQuantity || 0) * (item.purchasePrice || 0)), 0);

    return res.status(200).json(
        new ApiResponse(200, {
            franchise: {
                _id: franchise._id,
                name: franchise.name,
                shopName: franchise.shopName,
                vendorId: franchise.vendorId,
                city: franchise.city,
                phone: franchise.phone,
                email: franchise.email
            },
            inventory: inventory.map(item => ({
                _id: item._id,
                productName: item.product?.productName || 'Unknown Product',
                productId: item.product?.productId || '-',
                category: item.product?.category || '-',
                price: item.product?.price || 0,
                mrp: item.product?.mrp || 0,
                bv: item.product?.bv || 0,
                pv: item.product?.pv || 0,
                stockQuantity: item.stockQuantity || 0,
                purchasePrice: item.purchasePrice || 0,
                stockValue: (item.stockQuantity || 0) * (item.purchasePrice || 0),
                batchNo: item.batchNo || '-',
                lastUpdated: item.updatedAt
            })),
            summary: {
                totalProducts,
                totalStock,
                totalValue: parseFloat(totalValue.toFixed(2))
            }
        }, 'Franchise inventory fetched successfully')
    );
});
