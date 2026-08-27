import express from 'express';
import { getAdminInventory, createRequest, getMyRequests } from '../../../controllers/franchise/request.controller.js';
import { franchiseAuth } from '../../../middlewares/auth/franchiseAuthMiddleware.js';

const router = express.Router();

router.use(franchiseAuth);

router.get('/inventory', getAdminInventory);
router.post('/create', createRequest);
router.get('/my-requests', getMyRequests);

export default router;
