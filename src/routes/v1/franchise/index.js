import express from 'express';
import { loginFranchise } from '../../../controllers/franchise/auth.controller.js';
import inventoryRoutes from './inventoryRoutes.js';
import saleRoutes from './saleRoutes.js';
import requestRoutes from './requestRoutes.js';
import payoutRoutes from './payout.routes.js';

const router = express.Router();

// Public Routes
router.post('/login', loginFranchise);

// Protected Routes
router.use('/inventory', inventoryRoutes);
router.use('/sale', saleRoutes);
router.use('/requests', requestRoutes); 
router.use('/payout', payoutRoutes);

// Master Franchise Features
import masterPortalRoutes from './masterPortal.routes.js';
import franchiseMasterPayoutRoutes from './masterPayout.routes.js';
router.use('/master-portal', masterPortalRoutes);
router.use('/master-payout', franchiseMasterPayoutRoutes);

export default router;
