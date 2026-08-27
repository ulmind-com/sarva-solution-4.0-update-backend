import FranchiseInventory from '../../models/FranchiseInventory.model.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getMyInventory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const inventory = await FranchiseInventory.find({ franchise: req.franchise._id })
        .populate('product', '_id productId productName productImage.url price mrp category stockQuantity description hsnCode gst cgst sgst bv pv productDP')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await FranchiseInventory.countDocuments({ franchise: req.franchise._id });

    return res.status(200).json(
        new ApiResponse(200, {
            inventory,
            pagination: {
                total,
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit)
            }
        }, "Inventory fetched successfully")
    );
});
