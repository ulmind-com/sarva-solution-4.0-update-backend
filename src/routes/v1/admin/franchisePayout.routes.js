import express from 'express';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';
import * as franchisePayoutController from '../../../controllers/admin/franchisePayout.controller.js';

const router = express.Router();

// All routes require Admin privileges
router.use(authMiddleware, adminMiddleware);

// Audit List of specific generated payouts
router.route('/list').get(franchisePayoutController.getFranchisePayouts);

// Live viewing of ongoing month BV accumulations
router.route('/live-bv').get(franchisePayoutController.getLiveFranchiseBvStates);

// Manual Fulfillment Action
router.route('/:id/mark-paid').patch(franchisePayoutController.markPayoutPaid);

export default router;
