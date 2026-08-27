import express from 'express';
import { franchiseAuth } from '../../../middlewares/auth/franchiseAuthMiddleware.js';
import * as franchisePayoutController from '../../../controllers/franchise/franchisePayout.controller.js';

const router = express.Router();

// All routes require logged-in Franchise
router.use(franchiseAuth);

// Franchise personal logs
router.route('/history').get(franchisePayoutController.getMyPayouts);

// Franchise live month tracking 
router.route('/live-bv').get(franchisePayoutController.getMyLiveBv);

export default router;
