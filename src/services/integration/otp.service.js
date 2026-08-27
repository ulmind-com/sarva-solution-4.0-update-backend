import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

/**
 * APITxT Unified OTP integration.
 *
 * The request is made server-to-server (no browser Origin header), so it is NOT
 * subject to APITxT's UNAUTHORIZED_DOMAIN check that blocks direct frontend calls.
 * The auth key therefore lives only in the backend environment and is never
 * shipped to the client.
 */
const AUTH_KEY = process.env.APITXT_AUTHKEY;
const BASE_URL = process.env.APITXT_BASE_URL || 'https://apitxt.com/api/sendOTP';
const CHANNEL = process.env.APITXT_CHANNEL || 'sms';
const TEMPLATE_ID = process.env.APITXT_TEMPLATE_ID; // optional

/**
 * Reduce any user-entered number to a 10-digit local mobile (India).
 */
export const toLocalMobile = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    return digits;
};

/**
 * Format a number for the provider (country code prepended for 10-digit numbers).
 */
export const toProviderMobile = (phone) => {
    const local = toLocalMobile(phone);
    return local.length === 10 ? `91${local}` : String(phone || '').replace(/\D/g, '');
};

/**
 * Generate a numeric OTP of the requested length using a CSPRNG.
 */
export const generateOtp = (length = 6) => {
    const min = 10 ** (length - 1);
    const max = 10 ** length;
    return String(crypto.randomInt(min, max));
};

/**
 * Send an OTP SMS via APITxT. Throws on any non-success response so the caller
 * does not persist/charge for a delivery that did not happen.
 */
export const sendOtpSms = async (mobile, otp) => {
    if (!AUTH_KEY) {
        throw new Error('OTP service not configured (APITXT_AUTHKEY missing).');
    }

    const params = new URLSearchParams({
        authkey: AUTH_KEY,
        mobile,
        otp,
        channel: CHANNEL,
    });
    if (TEMPLATE_ID) params.set('template_id', TEMPLATE_ID);

    const response = await fetch(`${BASE_URL}?${params.toString()}`, { method: 'GET' });

    let data = null;
    try { data = await response.json(); } catch { /* non-JSON response */ }

    if (!response.ok || !data || data.status !== 'success') {
        const message = data?.message || `OTP provider error (HTTP ${response.status}).`;
        const error = new Error(message);
        error.providerError = data?.error;
        throw error;
    }

    return data;
};
