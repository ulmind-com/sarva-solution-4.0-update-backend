import express from 'express';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';
import {
    getAdminMasterPayouts,
    markMasterPayoutPaid
} from '../../../controllers/shared/masterPayout.controller.js';

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/', getAdminMasterPayouts);
router.patch('/:payoutId/mark-paid', markMasterPayoutPaid);

export default router;
