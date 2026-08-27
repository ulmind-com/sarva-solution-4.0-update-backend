import express from 'express';
import adminRoutes from './admin/index.js';
import franchiseRoutes from './franchise/index.js';
import userRoutes from './user/index.js';
import authRoutes from './public/auth.routes.js';
import productRoutes from './public/product.routes.js';
import newProductRoutes from './public/newProduct.routes.js';
import bannerRoutes from './public/banner.routes.js';
import galleryRoutes from './public/gallery.routes.js';

const router = express.Router();

/**
 * Public Routes
 */
router.use('/', authRoutes);
router.use('/products', productRoutes);
router.use('/newproducts', newProductRoutes);
router.use('/banner', bannerRoutes);
router.use('/gallery', galleryRoutes);

/**
 * Protected Module Routes
 */
router.use('/admin', adminRoutes);
router.use('/franchise', franchiseRoutes);
router.use('/user', userRoutes);

export default router;
