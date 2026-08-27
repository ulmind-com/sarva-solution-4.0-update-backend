import Product from '../../models/Product.model.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * Valid product categories — mirrors the Product model enum.
 * Kept as a simple Set for O(1) look-ups.
 */
const VALID_CATEGORIES = new Set([
    'aquaculture',
    'agriculture',
    'personal care',
    'health care',
    'home care',
    'luxury goods',
    'offer package',
]);

/**
 * @desc    Get products filtered by category with pagination
 * @route   GET /api/v1/user/products-by-category
 * @access  Authenticated User
 * @query   category  — 'all' (default) or one of the valid categories
 * @query   page      — page number (default 1)
 * @query   limit     — items per page (default 12, max 50)
 */
export const getProductsByCategory = asyncHandler(async (req, res) => {
    const {
        category = 'all',
        page = 1,
        limit = 12,
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Base filter — only active, approved, non-deleted products
    const filter = {
        isActive: true,
        isApproved: true,
        deletedAt: null,
    };

    // Add category constraint when not "all"
    const cat = String(category).toLowerCase().trim();
    if (cat !== 'all') {
        if (!VALID_CATEGORIES.has(cat)) {
            return res.status(200).json(
                new ApiResponse(200, {
                    products: [],
                    pagination: {
                        currentPage: pageNum,
                        totalPages: 0,
                        totalProducts: 0,
                        limit: limitNum,
                        hasNextPage: false,
                        hasPrevPage: false,
                    },
                }, 'No products found for this category'),
            );
        }
        filter.category = cat;
    }

    // Run both queries in parallel for efficiency
    const [products, totalProducts] = await Promise.all([
        Product.find(filter)
            .select('_id productId productName description price mrp finalPrice discount bv pv productDP category productImage stockQuantity isInStock isFeatured hsnCode')
            .skip(skip)
            .limit(limitNum)
            .sort({ createdAt: -1 })
            .lean(),
        Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalProducts / limitNum) || 1;

    return res.status(200).json(
        new ApiResponse(200, {
            products,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalProducts,
                limit: limitNum,
                hasNextPage: pageNum * limitNum < totalProducts,
                hasPrevPage: pageNum > 1,
            },
        }, 'Products fetched successfully'),
    );
});
