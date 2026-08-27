import NewProduct from '../../models/NewProduct.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../services/integration/cloudinary.service.js';

/* ------------------------------- PUBLIC (guest) ------------------------------- */

// GET /api/v1/newproducts  — list active products (no auth)
export const getNewProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 12, search, category, featured } = req.query;
    const query = { deletedAt: null, isActive: true };

    if (search) query.$text = { $search: search };
    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;

    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));

    const [products, total] = await Promise.all([
        NewProduct.find(query).sort({ isFeatured: -1, createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
        NewProduct.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / l) || 1;
    return res.status(200).json(
        new ApiResponse(200, {
            products,
            pagination: {
                total,
                currentPage: p,
                totalPages,
                hasNextPage: p < totalPages,
                hasPrevPage: p > 1,
            },
        }, 'Products fetched successfully')
    );
});

// GET /api/v1/newproducts/:id  — single product (no auth)
export const getNewProductById = asyncHandler(async (req, res) => {
    const product = await NewProduct.findOne({ _id: req.params.id, deletedAt: null, isActive: true }).lean();
    if (!product) throw new ApiError(404, 'Product not found');
    return res.status(200).json(new ApiResponse(200, product, 'Product fetched successfully'));
});

/* --------------------------------- ADMIN ---------------------------------- */

// POST /api/v1/admin/newproducts  — create (multipart: productImage)
export const createNewProduct = asyncHandler(async (req, res) => {
    const { productName, description, price, mrp, discount, category, stockQuantity, isFeatured, cgst, sgst, igst } = req.body;

    if (!req.file) throw new ApiError(400, 'Product image is required');
    const productImage = await uploadToCloudinary(req.file.buffer, 'sarvasolution/newstore');

    const product = await NewProduct.create({
        productName,
        description,
        price: Number(price),
        mrp: Number(mrp),
        discount: Number(discount) || 0,
        cgst: Number(cgst) || 0,
        sgst: Number(sgst) || 0,
        igst: Number(igst) || 0,
        category,
        stockQuantity: Number(stockQuantity) || 0,
        isFeatured: isFeatured === true || isFeatured === 'true',
        productImage,
        createdBy: req.user?._id,
    });

    return res.status(201).json(new ApiResponse(201, product, 'Product created successfully'));
});

// GET /api/v1/admin/newproducts  — list all (incl. inactive) for admin
export const adminListNewProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, category } = req.query;
    const query = { deletedAt: null };
    if (search) query.$text = { $search: search };
    if (category) query.category = category;

    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));

    const [products, total] = await Promise.all([
        NewProduct.find(query).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
        NewProduct.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / l) || 1;
    return res.status(200).json(
        new ApiResponse(200, { products, pagination: { total, currentPage: p, totalPages } }, 'Products fetched')
    );
});

// PATCH /api/v1/admin/newproducts/:id  — update (optional new image)
export const updateNewProduct = asyncHandler(async (req, res) => {
    const product = await NewProduct.findOne({ _id: req.params.id, deletedAt: null });
    if (!product) throw new ApiError(404, 'Product not found');

    const fields = ['productName', 'description', 'category'];
    fields.forEach((f) => {
        if (req.body[f] !== undefined) product[f] = req.body[f];
    });
    ['price', 'mrp', 'discount', 'stockQuantity', 'cgst', 'sgst', 'igst'].forEach((f) => {
        if (req.body[f] !== undefined) product[f] = Number(req.body[f]);
    });
    ['isActive', 'isFeatured'].forEach((f) => {
        if (req.body[f] !== undefined) product[f] = req.body[f] === true || req.body[f] === 'true';
    });

    if (req.file) {
        const newImage = await uploadToCloudinary(req.file.buffer, 'sarvasolution/newstore');
        if (product.productImage?.publicId) {
            await deleteFromCloudinary(product.productImage.publicId).catch(() => {});
        }
        product.productImage = newImage;
    }

    await product.save();
    return res.status(200).json(new ApiResponse(200, product, 'Product updated successfully'));
});

// DELETE /api/v1/admin/newproducts/:id  — soft delete
export const deleteNewProduct = asyncHandler(async (req, res) => {
    const product = await NewProduct.findOne({ _id: req.params.id, deletedAt: null });
    if (!product) throw new ApiError(404, 'Product not found');
    product.deletedAt = new Date();
    product.isActive = false;
    await product.save();
    return res.status(200).json(new ApiResponse(200, {}, 'Product deleted successfully'));
});
