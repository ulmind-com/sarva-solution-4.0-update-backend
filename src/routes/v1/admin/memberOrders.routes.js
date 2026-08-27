import express from 'express';
import {
    adminListMemberOrders,
    adminGetMemberOrder,
    adminDecideMemberOrder,
} from '../../../controllers/memberstore/memberOrder.controller.js';

// Mounted at /api/v1/admin/member-store  (auth + admin middleware applied in admin/index.js).
const router = express.Router();

router.get('/orders', adminListMemberOrders);
router.get('/orders/:id', adminGetMemberOrder);
router.patch('/orders/:id/decide', adminDecideMemberOrder);

export default router;
