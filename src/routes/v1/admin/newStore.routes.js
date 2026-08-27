import express from 'express';
import {
    createNewProduct,
    adminListNewProducts,
    updateNewProduct,
    deleteNewProduct,
} from '../../../controllers/newstore/newProduct.controller.js';
import {
    adminListGuestOrders,
    adminGetGuestOrder,
    adminUpdateGuestOrder,
} from '../../../controllers/newstore/guestOrder.controller.js';
import { getStoreConfig, updateStoreConfig } from '../../../controllers/newstore/storeConfig.controller.js';
import { uploadProductImage } from '../../../middlewares/upload/uploadMiddleware.js';

// Mounted at /api/v1/admin/newstore  (auth + admin middleware already applied in admin/index.js).
const router = express.Router();

// Products
router.get('/products', adminListNewProducts);
router.post('/products', uploadProductImage, createNewProduct);
router.patch('/products/:id', uploadProductImage, updateNewProduct);
router.delete('/products/:id', deleteNewProduct);

// Guest orders
router.get('/orders', adminListGuestOrders);
router.get('/orders/:id', adminGetGuestOrder);
router.patch('/orders/:id', adminUpdateGuestOrder);

// Store config (Razorpay creds + COD toggle)
router.get('/config', getStoreConfig);
router.put('/config', updateStoreConfig);

export default router;
