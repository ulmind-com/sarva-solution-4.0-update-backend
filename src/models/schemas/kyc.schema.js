import mongoose from 'mongoose';

export const kycSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected', 'verified'],
        default: 'none'
    },
    aadhaarNumber: { type: String, trim: true },
    aadhaarFront: { url: String, publicId: String },
    aadhaarBack: { url: String, publicId: String },
    panImage: { url: String, publicId: String },
    submittedAt: Date,
    verifiedAt: Date,
    rejectionReason: String
}, { _id: false });
