import dotenv from 'dotenv';
dotenv.config();

// Validate critical environment variables
const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
const missingRequired = requiredEnv.filter(env => !process.env[env]);

if (missingRequired.length > 0) {
    console.error('\x1b[31m%s\x1b[0m', '==================================================');
    console.error('\x1b[31m%s\x1b[0m', '🚨 CRITICAL ERROR: MISSING REQUIRED ENVIRONMENT VARIABLES');
    console.error('\x1b[31m%s\x1b[0m', '==================================================');
    missingRequired.forEach(env => {
        console.error('\x1b[31m%s\x1b[0m', `   - ${env}`);
    });
    console.error('\x1b[33m%s\x1b[0m', 'Please create a .env file or set these variables in your environment.');
    console.error('\x1b[33m%s\x1b[0m', 'Refer to .env.example for details.');
    console.error('\x1b[31m%s\x1b[0m', '==================================================');
    process.exit(1);
}

// Log warnings for optional environment variables
const warnings = [];
if (!process.env.RESEND_API_KEY) warnings.push('RESEND_API_KEY (Required for emails)');
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    warnings.push('CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET (Required for image uploads)');
}
if ((process.env.OTP_VERIFICATION_REQUIRED !== 'false') && !process.env.APITXT_AUTHKEY) {
    warnings.push('APITXT_AUTHKEY (OTP verification is enabled but APITXT_AUTHKEY is missing)');
}

if (warnings.length > 0) {
    console.warn('\x1b[33m%s\x1b[0m', '==================================================');
    console.warn('\x1b[33m%s\x1b[0m', '⚠️ WARNING: MISSING OPTIONAL ENVIRONMENT VARIABLES');
    console.warn('\x1b[33m%s\x1b[0m', '==================================================');
    warnings.forEach(warn => {
        console.warn('\x1b[33m%s\x1b[0m', `   - ${warn}`);
    });
    console.warn('\x1b[32m%s\x1b[0m', 'The app will still run, but some integrations (email, uploads, OTP) will fail.');
    console.warn('\x1b[33m%s\x1b[0m', '==================================================');
}

const Configs = {
    PORT: process.env.PORT || 8000,
    MONGO_URI: process.env.MONGO_URI,
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET,

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

    // Resend & Mail
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MAIL_ADDRESS: process.env.MAIL_ADDRESS || 'onboarding@resend.dev',

    // APITxT OTP integration (phone verification on registration)
    APITXT_AUTHKEY: process.env.APITXT_AUTHKEY,
    APITXT_BASE_URL: process.env.APITXT_BASE_URL || 'https://apitxt.com/api/sendOTP',
    APITXT_CHANNEL: process.env.APITXT_CHANNEL || 'sms',
    APITXT_TEMPLATE_ID: process.env.APITXT_TEMPLATE_ID,
    OTP_VERIFICATION_REQUIRED: (process.env.OTP_VERIFICATION_REQUIRED || 'true') !== 'false',
}

export default Configs;