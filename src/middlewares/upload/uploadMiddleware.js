import multer from 'multer';

// Use memory storage to handle files as buffers for Cloudinary stream upload
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'), false);
        }
    }
});

export const uploadSingle = upload.single('profilePicture');
export const uploadProductImage = upload.single('productImage');

export const uploadKYC = upload.fields([
    { name: 'aadhaarFront', maxCount: 1 },
    { name: 'aadhaarBack', maxCount: 1 },
    { name: 'panImage', maxCount: 1 }
]);

export { upload }; // Export the existing multer instance
