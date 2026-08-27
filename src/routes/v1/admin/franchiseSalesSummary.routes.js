import express from 'express';
import { getMonthlyFranchiseSales } from '../../../controllers/admin/franchiseSalesSummary.controller.js';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// GET /api/v1/admin/franchise-sales-summary/monthly?month=YYYY-MM
router.get('/monthly', getMonthlyFranchiseSales);

export default router;
