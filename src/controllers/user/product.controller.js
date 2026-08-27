import Product from '../../models/Product.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * @desc    Get all products with pagination (simplified)
 * @route   GET /api/v1/user/products
 * @access  Authenticated User
 */
export const getUserProducts = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 12
    } = req.query;

    const skip = (page - 1) * limit;

    // Get all active, approved products (no filtering)
    const products = await Product.find({
        isActive: true,
        isApproved: true,
        deletedAt: null
    })
        .select('_id productId productName description price mrp finalPrice discount bv pv productDP category productImage stockQuantity isInStock isFeatured hsnCode')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }) // Newest first
        .lean();

    // Get total count for pagination
    const totalProducts = await Product.countDocuments({
        isActive: true,
        isApproved: true,
        deletedAt: null
    });

    return res.status(200).json(
        new ApiResponse(200, {
            products,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(totalProducts / limit),
                totalProducts,
                limit: Number(limit),
                hasNextPage: page * limit < totalProducts,
                hasPrevPage: page > 1
            }
        }, 'Products fetched successfully')
    );
});

/**
 * @desc    Get single product details with ALL information including stock
 * @route   GET /api/v1/user/products/:productId
 * @access  Public (No authentication required)
 */
export const getProductDetails = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const product = await Product.findOne({
        _id: productId,
        isActive: true,
        isApproved: true,
        deletedAt: null
    })
        .select('-deletedAt -__v') // Exclude internal fields
        .lean();

    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    // Add computed fields
    product.isInStock = product.stockQuantity > 0;
    product.stockStatus = product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock';

    // Calculate discount percentage if applicable
    if (product.mrp && product.finalPrice) {
        product.discountPercentage = Math.round(((product.mrp - product.finalPrice) / product.mrp) * 100);
    }

    // Fetch related products (same category)
    const relatedProducts = await Product.find({
        category: product.category,
        _id: { $ne: productId },
        isActive: true,
        isApproved: true,
        deletedAt: null,
        stockQuantity: { $gt: 0 } // Only in-stock related products
    })
        .select('_id productId productName finalPrice mrp productImage stockQuantity bv pv')
        .limit(6)
        .lean();

    return res.status(200).json(
        new ApiResponse(200, {
            product,
            relatedProducts
        }, 'Product details fetched successfully')
    );
});
