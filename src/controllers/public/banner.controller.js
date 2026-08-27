import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import Banner from '../../models/Banner.model.js';

export const getActiveBanner = asyncHandler(async (req, res) => {
    // 1. Fetch single banner document
    const banner = await Banner.findOne({ isActive: true }).select('imageUrl -_id');

    // It's perfectly fine to return null if no banner has been set yet
    const bannerUrl = banner ? banner.imageUrl : null;

    return res.status(200).json(
        new ApiResponse(200, {
            bannerUrl
        }, 'Banner fetched successfully')
    );
});
