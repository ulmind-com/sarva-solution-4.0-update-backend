import express from 'express';
import { uploadGalleryImage } from '../../../controllers/admin/gallery.controller.js';
import { upload } from '../../../middlewares/upload/uploadMiddleware.js';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Single field upload expecting "image"
router.post('/upload', upload.single('image'), uploadGalleryImage);

export default router;
