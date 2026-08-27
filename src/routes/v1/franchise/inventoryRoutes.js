import express from 'express';
import { getMyInventory } from '../../../controllers/franchise/inventory.controller.js';
import { franchiseAuth } from '../../../middlewares/auth/franchiseAuthMiddleware.js';

const router = express.Router();

router.use(franchiseAuth);

router.get('/list', getMyInventory);

export default router;
