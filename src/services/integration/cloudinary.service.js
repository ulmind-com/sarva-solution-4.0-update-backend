import { cloudinary } from '../../config/cloudinary.js';
import streamifier from 'streamifier';

export const uploadToCloudinary = (fileBuffer, folder = 'sarvasolution/profiles', options = {}) => {
    return new Promise((resolve, reject) => {
        console.log(`[Cloudinary] Starting upload for folder: ${folder}`);

        // Default transformation preserves aspect ratio (no forced square crop)
        const defaultTransformation = [
            { width: 1200, height: 1200, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "auto" }
        ];

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: "auto",
                timeout: 120000,
                transformation: options.transformation || defaultTransformation
            },
            (error, result) => {
                if (error) {
                    console.error('[Cloudinary] Upload Error:', error);
                    return reject(error);
                }
                console.log('[Cloudinary] Upload Success:', result.secure_url);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id
                });
            }
        );

        try {
            streamifier.createReadStream(fileBuffer).pipe(uploadStream);
        } catch (err) {
            console.error('[Cloudinary] Stream Error:', err);
            reject(err);
        }
    });
};

/**
 * Upload PDF to Cloudinary with public access
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {String} folder - Cloudinary folder path
 * @param {String} filename - Custom filename (optional)
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadPDFToCloudinary = (pdfBuffer, folder = 'sarvasolution/invoices', filename = null) => {
    return new Promise((resolve, reject) => {
        console.log(`[Cloudinary PDF] Starting upload for folder: ${folder}`);

        const uploadOptions = {
            folder: folder,
            resource_type: 'raw', // CRITICAL: Use 'raw' for PDFs
            type: 'upload', // Explicitly set upload type
            access_mode: 'public', // Ensure public access
            timeout: 120000
        };

        // Add custom filename if provided
        if (filename) {
            uploadOptions.public_id = filename;
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error('[Cloudinary PDF] Upload Error:', error);
                    return reject(error);
                }
                console.log('[Cloudinary PDF] Upload Success:', result.secure_url);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id
                });
            }
        );

        try {
            streamifier.createReadStream(pdfBuffer).pipe(uploadStream);
        } catch (err) {
            console.error('[Cloudinary PDF] Stream Error:', err);
            reject(err);
        }
    });
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Public ID of the file to delete
 */
export const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return;
        console.log(`[Cloudinary] Deleting file: ${publicId}`);
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('[Cloudinary] Delete Error:', error);
        // We don't throw error here to prevent breaking the flow, just log it
    }
};
