import express from 'express';
import { uploadBanner } from '../../../controllers/admin/banner.controller.js';
import { upload } from '../../../middlewares/upload/uploadMiddleware.js';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Single field upload expecting "image"
router.post('/upload', upload.single('image'), uploadBanner);

export default router;
