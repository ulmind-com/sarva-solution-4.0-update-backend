import express from 'express';
import { getGalleryImages } from '../../../controllers/public/gallery.controller.js';

const router = express.Router();

// Fetch gallery items natively with zero auth
router.get('/', getGalleryImages);

export default router;
