import mongoose from 'mongoose';

export const addressSchema = new mongoose.Schema({
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    zipCode: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                return /^\d{6}$/.test(v); // Assuming Indian Pincode
            },
            message: props => `${props.value} is not a valid 6-digit zip code!`
        }
    },
    landmark: { type: String, trim: true },
    coordinates: {
        latitude: Number,
        longitude: Number
    }
}, { _id: false });
