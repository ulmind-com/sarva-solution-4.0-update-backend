import express from 'express';
import { getUserByMemberId, sellToUser, getSalesHistory } from '../../../controllers/franchise/sale.controller.js';
import { franchiseAuth } from '../../../middlewares/auth/franchiseAuthMiddleware.js';
import { validateFranchiseSale } from '../../../middlewares/validation/franchiseSaleValidation.js';

const router = express.Router();

router.use(franchiseAuth);

router.get('/user/:memberId', getUserByMemberId);
router.post('/sell', validateFranchiseSale, sellToUser);
router.get('/history', getSalesHistory);

export default router;
