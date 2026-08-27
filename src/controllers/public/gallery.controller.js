import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import Gallery from '../../models/Gallery.model.js';

export const getGalleryImages = asyncHandler(async (req, res) => {
    // Fetch generic gallery info natively with zero auth
    // Sort ascending by position
    const galleryItems = await Gallery.find()
                                      .sort({ position: 1 })
                                      .select('position title imageUrl -_id'); // Hide _id and publicId from frontend

    return res.status(200).json(
        new ApiResponse(200, galleryItems, 'Gallery fetched successfully')
    );
});
