import bcrypt from 'bcryptjs';
import OtpVerification from '../../models/OtpVerification.model.js';
import User from '../../models/User.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { sendOtpSms, generateOtp, toLocalMobile, toProviderMobile } from '../../services/integration/otp.service.js';

const OTP_LENGTH = 6;
const OTP_TTL_MS = 5 * 60 * 1000;          // code valid for 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000;      // min gap between two sends
const SEND_WINDOW_MS = 30 * 60 * 1000;     // rate-limit window
const MAX_SENDS_PER_WINDOW = 5;            // sends allowed per window
const MAX_VERIFY_ATTEMPTS = 5;             // wrong-OTP attempts before lockout
export const VERIFIED_WINDOW_MS = 15 * 60 * 1000; // verified phone usable for register

const isValidIndianMobile = (local) => /^[6-9]\d{9}$/.test(local);

const requireValidMobile = (phone) => {
    const local = toLocalMobile(phone);
    if (!isValidIndianMobile(local)) {
        throw new ApiError(400, 'Please provide a valid 10-digit mobile number.');
    }
    return local;
};

/**
 * POST /api/v1/otp/send  { phone }
 * Generates an OTP, sends it via SMS and stores its hash + rate-limit state.
 */
export const sendOtp = asyncHandler(async (req, res) => {
    const local = requireValidMobile(req.body.phone);

    // Mirror the registration limit so we never send OTPs that can't be used.
    const phoneCount = await User.countDocuments({ phone: local });
    if (phoneCount >= 3) {
        throw new ApiError(400, 'Maximum 3 accounts allowed per mobile number.');
    }

    const now = Date.now();
    let record = await OtpVerification.findOne({ phone: local, purpose: 'register' });

    if (record) {
        if (record.lastSentAt && now - record.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
            const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - record.lastSentAt.getTime())) / 1000);
            throw new ApiError(429, `Please wait ${wait}s before requesting another OTP.`);
        }
        if (!record.windowStart || now - record.windowStart.getTime() > SEND_WINDOW_MS) {
            record.windowStart = new Date(now);
            record.sendCount = 0;
        }
        if (record.sendCount >= MAX_SENDS_PER_WINDOW) {
            throw new ApiError(429, 'Too many OTP requests. Please try again later.');
        }
    }

    const otp = generateOtp(OTP_LENGTH);
    const otpHash = await bcrypt.hash(otp, 10);

    // Send first — only persist if the provider actually accepted the request.
    await sendOtpSms(toProviderMobile(local), otp);

    if (!record) {
        record = new OtpVerification({ phone: local, purpose: 'register', windowStart: new Date(now), sendCount: 0 });
    }
    record.otpHash = otpHash;
    record.attempts = 0;
    record.verified = false;
    record.verifiedAt = null;
    record.expiresAt = new Date(now + OTP_TTL_MS);
    record.lastSentAt = new Date(now);
    record.sendCount += 1;
    await record.save();

    return res.status(200).json(
        new ApiResponse(200, { phone: local, expiresInSeconds: OTP_TTL_MS / 1000 }, 'OTP sent successfully.')
    );
});

/**
 * POST /api/v1/otp/verify  { phone, otp }
 * Validates the OTP and marks the phone as verified for a short window.
 */
export const verifyOtp = asyncHandler(async (req, res) => {
    const local = requireValidMobile(req.body.phone);
    const otp = String(req.body.otp || '').trim();
    if (!/^\d{4,8}$/.test(otp)) {
        throw new ApiError(400, 'Please enter the OTP you received.');
    }

    const record = await OtpVerification.findOne({ phone: local, purpose: 'register' });
    if (!record || !record.otpHash) {
        throw new ApiError(400, 'Please request an OTP first.');
    }

    // Idempotent success if already verified within the window.
    if (record.verified && record.verifiedAt && Date.now() - record.verifiedAt.getTime() < VERIFIED_WINDOW_MS) {
        return res.status(200).json(new ApiResponse(200, { phone: local, verified: true }, 'Phone number already verified.'));
    }

    if (record.expiresAt.getTime() < Date.now()) {
        throw new ApiError(400, 'OTP has expired. Please request a new one.');
    }
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
        throw new ApiError(429, 'Too many incorrect attempts. Please request a new OTP.');
    }

    const match = await bcrypt.compare(otp, record.otpHash);
    record.attempts += 1;
    if (!match) {
        await record.save();
        throw new ApiError(400, 'Incorrect OTP. Please try again.');
    }

    record.verified = true;
    record.verifiedAt = new Date();
    await record.save();

    return res.status(200).json(new ApiResponse(200, { phone: local, verified: true }, 'Phone number verified successfully.'));
});

/**
 * Guard used by the registration controller: throws unless the given phone has a
 * recent verified OTP. Keeps server-side verification tamper-proof (the frontend
 * gating alone could otherwise be bypassed).
 */
export const assertPhoneVerified = async (phone) => {
    const local = toLocalMobile(phone);
    const record = await OtpVerification.findOne({ phone: local, purpose: 'register', verified: true });
    if (!record || !record.verifiedAt || Date.now() - record.verifiedAt.getTime() > VERIFIED_WINDOW_MS) {
        throw new ApiError(400, 'Please verify your phone number with OTP before registering.');
    }
    return record;
};

/**
 * Remove OTP records for a phone once it has been used to register.
 */
export const consumeVerifiedOtp = async (phone) => {
    const local = toLocalMobile(phone);
    await OtpVerification.deleteMany({ phone: local, purpose: 'register' });
};
