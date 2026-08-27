import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import Gallery from '../../models/Gallery.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../services/integration/cloudinary.service.js';

export const uploadGalleryImage = asyncHandler(async (req, res) => {
    const { title, position } = req.body;

    // 1. Validate inputs
    if (!title) {
        throw new ApiError(400, 'Image title is required');
    }

    const pos = parseInt(position, 10);
    if (isNaN(pos) || pos < 1 || pos > 12) {
        throw new ApiError(400, 'Position must be a number between 1 and 12');
    }

    // 2. Validate file existence
    if (!req.file || !req.file.buffer) {
        throw new ApiError(400, 'Please upload an image file');
    }

    // 3. Fetch existing gallery image at this position so we can delete the old one
    const existingGalleryImage = await Gallery.findOne({ position: pos });

    if (existingGalleryImage && existingGalleryImage.publicId) {
        // Asynchronously clear the old image from Cloudinary
        await deleteFromCloudinary(existingGalleryImage.publicId);
    }

    // 4. Upload new image strictly unmodified (empty transformation to prevent cropping)
    const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        'sarvasolution/gallery',
        { transformation: [] } // CRITICAL: Skip default crops and limits to preserve original image
    );

    // 5. Update or Create DB Record
    if (existingGalleryImage) {
        existingGalleryImage.title = title;
        existingGalleryImage.imageUrl = uploadResult.url;
        existingGalleryImage.publicId = uploadResult.publicId;
        await existingGalleryImage.save();
    } else {
        await Gallery.create({
            position: pos,
            title: title,
            imageUrl: uploadResult.url,
            publicId: uploadResult.publicId
        });
    }

    return res.status(200).json(
        new ApiResponse(200, {
            position: pos,
            title: title,
            imageUrl: uploadResult.url
        }, 'Gallery image uploaded successfully')
    );
});
