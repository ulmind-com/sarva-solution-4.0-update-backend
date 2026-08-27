import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { addressSchema } from './schemas/address.schema.js';

const franchiseSchema = new mongoose.Schema({
    // Basic Information
    vendorId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 100
    },
    shopName: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 150
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    password: {
        type: String,
        required: true
    },

    // Location Details
    city: {
        type: String,
        required: true,
        index: true
    },
    shopAddress: { type: addressSchema, required: true },

    // Status
    status: {
        type: String,
        enum: ['active', 'blocked', 'pending'],
        default: 'active',
        index: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    blockedAt: { type: Date },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    blockReason: { type: String },

    // Authentication
    role: {
        type: String,
        default: 'franchise',
        immutable: true
    },
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    accountLockUntil: { type: Date },

    // Metrics
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    commissionEarned: { type: Number, default: 0 },
    activeCustomers: { type: Number, default: 0 },

    // Verification
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    phoneVerified: { type: Boolean, default: false },

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, default: null },

    // Timezone Fields
    createdAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') },
    updatedAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') }

}, {
    timestamps: true
});

franchiseSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
    next();
});

// Soft Delete Middleware
franchiseSchema.pre('find', function () {
    this.where({ deletedAt: null });
});
franchiseSchema.pre('findOne', function () {
    this.where({ deletedAt: null });
});

const Franchise = mongoose.model('Franchise', franchiseSchema);
export default Franchise;
