import express from 'express';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';
import { getFranchiseInventory } from '../../../controllers/admin/franchiseInventoryView.controller.js';

const router = express.Router();

// All routes require Admin privileges
router.use(authMiddleware, adminMiddleware);

// View a specific franchise's current inventory
router.get('/:franchiseId', getFranchiseInventory);

export default router;
