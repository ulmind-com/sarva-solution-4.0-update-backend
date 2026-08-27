import Product from '../../models/Product.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../services/integration/cloudinary.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * Create a new product (Admin only)
 */
export const createProduct = asyncHandler(async (req, res) => {
    const { name, bv, description, price, segment } = req.body;

    // Validation
    if (!name || !bv || !price || !segment) {
        throw new ApiError(400, 'Name, BV, Price, and Segment are required');
    }

    if (!req.file) {
        throw new ApiError(400, 'Product image is required');
    }

    // Upload to Cloudinary
    const image = await uploadToCloudinary(req.file.buffer, 'sarvasolution/products');

    const newProduct = new Product({
        productName: name,
        bv: Number(bv),
        description,
        price: Number(price),
        mrp: Number(price),
        productDP: Number(price),
        category: segment,
        productImage: image,
        stockQuantity: 100
    });

    await newProduct.save();

    return res.status(201).json(
        new ApiResponse(201, newProduct, 'Product created successfully')
    );
});

/**
 * Get all active products
 */
export const getProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({ isActive: true });
    return res.status(200).json(
        new ApiResponse(200, products, 'Products fetched successfully')
    );
});

/**
 * Update a product (Admin only)
 */
export const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, bv, description, price, segment, isActive } = req.body;

    const product = await Product.findById(id);
    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    // Update fields if provided
    if (name) product.productName = name;
    if (bv) product.bv = Number(bv);
    if (description) product.description = description;
    if (price) product.price = Number(price);
    if (segment) product.category = segment;
    if (isActive !== undefined) product.isActive = isActive;

    if (req.file) {
        // Delete old image
        if (product.productImage?.publicId) {
            await deleteFromCloudinary(product.productImage.publicId);
        }

        // Upload new
        const image = await uploadToCloudinary(req.file.buffer, 'sarvasolution/products');
        product.productImage = image;
    }

    await product.save();

    return res.status(200).json(
        new ApiResponse(200, product, 'Product updated successfully')
    );
});

/**
 * Delete (Soft Delete) a product (Admin only)
 */
export const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    // Delete image from Cloudinary to save storage/cost
    if (product.productImage?.publicId) {
        await deleteFromCloudinary(product.productImage.publicId);
    }

    // Soft delete
    product.isActive = false;
    await product.save();

    return res.status(200).json(
        new ApiResponse(200, {}, 'Product deleted (deactivated) and image removed successfully')
    );
});
