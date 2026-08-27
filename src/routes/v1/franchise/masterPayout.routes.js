import express from 'express';
import { franchiseAuth } from '../../../middlewares/auth/franchiseAuthMiddleware.js';
import {
    getMyMasterPayouts
} from '../../../controllers/shared/masterPayout.controller.js';

const router = express.Router();

router.use(franchiseAuth);

router.get('/', getMyMasterPayouts);

export default router;
