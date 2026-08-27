import express from 'express';
import { getAllRequests, approveRequest, rejectRequest } from '../../../controllers/admin/request.controller.js';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/list', getAllRequests);
router.patch('/:requestId/approve', approveRequest);
router.patch('/:requestId/reject', rejectRequest);

export default router;
