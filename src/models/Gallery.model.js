import mongoose from 'mongoose';

const gallerySchema = new mongoose.Schema({
    position: {
        type: Number,
        required: true,
        unique: true,
        min: 1,
        max: 12
    },
    title: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    publicId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const Gallery = mongoose.model('Gallery', gallerySchema);
export default Gallery;
