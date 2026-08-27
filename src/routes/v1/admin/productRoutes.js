import express from 'express';
import {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    approveProduct,
    toggleProductStatus,
    addStock,
    removeStock,
    getStockHistory
} from '../../../controllers/admin/product.controller.js';

import { uploadProductImage } from '../../../middlewares/upload/uploadMiddleware.js';
import { validateProductInput } from '../../../middlewares/validation/productValidation.js';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';

const router = express.Router();

// Apply auth & admin check to all routes
router.use(authMiddleware, adminMiddleware);

// Create
router.post('/create', uploadProductImage, validateProductInput, createProduct);

// Read
router.get('/list', getAllProducts);
router.get('/:productId', getProductById);

// Update
router.put('/update/:productId', uploadProductImage, validateProductInput, updateProduct);

// Status & Approval
router.patch('/approve/:productId', approveProduct);
router.patch('/toggle-status/:productId', toggleProductStatus);

// Stock Management
router.patch('/stock/add/:productId', addStock);
router.patch('/stock/remove/:productId', removeStock);
router.get('/stock/history/:productId', getStockHistory);

// Delete (Soft)
router.delete('/:productId', deleteProduct);

export default router;
