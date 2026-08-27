import express from 'express';
import { createProduct, getProducts, updateProduct, deleteProduct } from '../../../controllers/product/product.controller.js';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';
import { uploadProductImage } from '../../../middlewares/upload/uploadMiddleware.js';

const router = express.Router();

// Public route to get products
router.get('/', getProducts);

// Admin only route to create product
router.post('/', authMiddleware, adminMiddleware, uploadProductImage, createProduct);

// Admin only routes to update and delete products
router.patch('/:id', authMiddleware, adminMiddleware, uploadProductImage, updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, deleteProduct);

export default router;
