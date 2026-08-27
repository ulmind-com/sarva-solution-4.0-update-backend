import express from 'express';
import { sellToFranchise, getSalesHistory } from '../../../controllers/admin/sale.controller.js';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.post('/sell-to-franchise', sellToFranchise);
router.get('/list', getSalesHistory);
// router.patch('/mark-paid/:invoiceId', markInvoicePaid); // TODO: Add if needed

export default router;
