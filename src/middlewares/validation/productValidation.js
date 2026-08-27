import { ApiError } from '../../utils/ApiError.js';
import Product from '../../models/Product.model.js';

export const validateProductInput = async (req, res, next) => {
    try {
        const {
            productName,
            description,
            price,
            mrp,
            category,
            productDP
        } = req.body;

        // 1. Basic Required Fields Check
        if (!productName || !description || !price || !mrp || !category || !productDP) {
            throw new ApiError(400, 'Missing required fields: Name, Description, Price, MRP, Category, ProductDP are mandatory.');
        }

        // 2. Numeric Validations
        if (Number(price) < 0 || Number(mrp) < 0 || Number(productDP) < 0) {
            throw new ApiError(400, 'Price, MRP, and ProductDP must be positive numbers.');
        }

        // 3. Logic: MRP vs Price
        if (Number(mrp) < Number(price)) {
            throw new ApiError(400, 'MRP cannot be less than the Selling Price.');
        }

        // 4. Category Enum
        const validCategories = [
            'aquaculture', 'agriculture', 'personal care',
            'health care', 'home care', 'luxury goods'
        ];
        if (!validCategories.includes(category)) {
            throw new ApiError(400, `Invalid category. Allowed: ${validCategories.join(', ')}`);
        }

        // 5. Duplicate Name Check (Exclude current product if updating)
        if (productName) {
            const existingProduct = await Product.findOne({ productName: productName.trim() });
            if (existingProduct) {
                // If updating, check if ID matches (using simple ID compare or param check)
                if (req.params.productId && existingProduct._id.toString() === req.params.productId) {
                    // Safe
                } else {
                    throw new ApiError(409, 'Product with this name already exists.');
                }
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};
