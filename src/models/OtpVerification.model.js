import mongoose from 'mongoose';

/**
 * Stores phone OTP verification state for public flows (e.g. registration).
 * The OTP itself is never stored in plain text — only a bcrypt hash.
 *
 * A TTL index auto-removes stale documents 30 minutes after their last update,
 * so the collection stays small without any manual cleanup.
 */
const otpVerificationSchema = new mongoose.Schema({
    // 10-digit local mobile number (country code stripped) used as the lookup key.
    phone: { type: String, required: true, index: true, trim: true },
    purpose: { type: String, default: 'register' },
    otpHash: { type: String, required: true },

    // How many times the current OTP has been checked (anti brute-force).
    attempts: { type: Number, default: 0 },

    // Rolling send-rate window (anti SMS-credit abuse).
    sendCount: { type: Number, default: 0 },
    windowStart: { type: Date, default: Date.now },
    lastSentAt: { type: Date, default: Date.now },

    // Verification result.
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },

    // Validity window of the OTP code itself.
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

// Auto-clean documents 30 minutes after the last write.
otpVerificationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 30 });

const OtpVerification = mongoose.model('OtpVerification', otpVerificationSchema);
export default OtpVerification;
