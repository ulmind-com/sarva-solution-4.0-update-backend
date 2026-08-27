import express from 'express';
import { getActiveBanner } from '../../../controllers/public/banner.controller.js';

const router = express.Router();

// Fetch banner natively with zero auth
router.get('/', getActiveBanner);

export default router;
