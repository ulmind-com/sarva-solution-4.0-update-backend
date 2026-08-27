import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import Banner from '../../models/Banner.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../services/integration/cloudinary.service.js';

export const uploadBanner = asyncHandler(async (req, res) => {
    // 1. Validate file existence
    if (!req.file || !req.file.buffer) {
        throw new ApiError(400, 'Please upload an image file');
    }

    // 2. Fetch existing banner so we can delete the old one
    const existingBanner = await Banner.findOne();

    if (existingBanner && existingBanner.publicId) {
        // Asynchronously clear the old image from Cloudinary
        // Even if it fails silently, the new image will still be stored
        await deleteFromCloudinary(existingBanner.publicId);
    }

    // 3. Upload new image strictly unmodified (empty transformation)
    const uploadResult = await uploadToCloudinary(
        req.file.buffer, 
        'sarvasolution/banners',
        { transformation: [] } // CRITICAL: Skip default crops and limits to preserve original image
    );

    // 4. Update the DB
    if (existingBanner) {
        existingBanner.imageUrl = uploadResult.url;
        existingBanner.publicId = uploadResult.publicId;
        await existingBanner.save();
    } else {
        await Banner.create({
            imageUrl: uploadResult.url,
            publicId: uploadResult.publicId
        });
    }

    return res.status(200).json(
        new ApiResponse(200, {
            imageUrl: uploadResult.url
        }, 'Banner uploaded successfully')
    );
});
