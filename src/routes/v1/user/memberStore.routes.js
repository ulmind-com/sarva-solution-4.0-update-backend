import express from 'express';
import {
    getMemberStoreConfig,
    placeMemberCodOrder,
    placeMemberWalletOrder,
    createMemberRazorpayOrder,
    verifyMemberRazorpayPayment,
    getMyMemberOrders,
} from '../../../controllers/memberstore/memberOrder.controller.js';

// Mounted at /api/v1/user/member-store  (authMiddleware already applied in user/index.js).
const router = express.Router();

router.get('/config', getMemberStoreConfig);
router.get('/orders', getMyMemberOrders);
router.post('/orders/cod', placeMemberCodOrder);
router.post('/orders/wallet', placeMemberWalletOrder);
router.post('/orders/razorpay', createMemberRazorpayOrder);
router.post('/orders/razorpay/verify', verifyMemberRazorpayPayment);

export default router;
