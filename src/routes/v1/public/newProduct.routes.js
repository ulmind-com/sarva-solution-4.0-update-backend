import express from 'express';
import { getNewProducts, getNewProductById } from '../../../controllers/newstore/newProduct.controller.js';
import { getPublicStoreConfig } from '../../../controllers/newstore/storeConfig.controller.js';
import {
    placeCodOrder,
    createRazorpayOrder,
    verifyRazorpayPayment,
    trackGuestOrder,
} from '../../../controllers/newstore/guestOrder.controller.js';

// Mounted at /api/v1/newproducts  — fully PUBLIC (no auth). This is the guest store.
const router = express.Router();

// Store config for the app (COD/online availability + Razorpay key id). Keep BEFORE '/:id'.
router.get('/config', getPublicStoreConfig);

// Orders (guest checkout). Keep BEFORE '/:id'.
router.post('/orders', placeCodOrder);
router.post('/orders/razorpay', createRazorpayOrder);
router.post('/orders/razorpay/verify', verifyRazorpayPayment);
router.get('/orders/:orderId', trackGuestOrder);

// Catalog
router.get('/', getNewProducts);
router.get('/:id', getNewProductById);

export default router;
