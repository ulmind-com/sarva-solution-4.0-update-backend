import express from 'express';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';
import { getFranchiseSaleLogs } from '../../../controllers/admin/franchiseSaleLogs.controller.js';

const router = express.Router();

// All routes require Admin privileges
router.use(authMiddleware, adminMiddleware);

// Get franchise sale logs (date-wise grouped)
router.get('/', getFranchiseSaleLogs);

export default router;
