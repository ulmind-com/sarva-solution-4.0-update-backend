import express from 'express';
import { register } from '../../../controllers/auth/register_user.controller.js';
import { login } from '../../../controllers/auth/login_user.controller.js';
import { sendOtp, verifyOtp } from '../../../controllers/auth/otp.controller.js';
import { getProfile, getFirstPurchaseStatus } from '../../../controllers/user/profile.controller.js';
import { updateProfile } from '../../../controllers/user/update_profile.controller.js';
import { submitKYC } from '../../../controllers/user/kyc.controller.js';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import { uploadSingle, uploadKYC } from '../../../middlewares/upload/uploadMiddleware.js';

const router = express.Router();

router.post('/register/user', register); // Removed uploadSingle from register as it only requires 6 text fields now
router.post('/login/user', login);

// Phone OTP verification (used by the public registration form)
router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);

// Password Recovery
import { forgotPassword, resetPassword } from '../../../controllers/auth/password.controller.js';
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:resetToken', resetPassword);

// Temporary Setup Route
import { setupAdminFix } from '../../../controllers/admin/setup_admin.controller.js';
import { getUserName } from '../../../controllers/public/user.controller.js';

router.get('/setup-admin-fix', setupAdminFix);
router.get('/user-name/:memberId', getUserName);

router.get('/profile', authMiddleware, getProfile);
router.patch('/profile', authMiddleware, uploadSingle, updateProfile);
router.post('/kyc/submit', authMiddleware, uploadKYC, submitKYC);
router.get('/first-purchase-status', authMiddleware, getFirstPurchaseStatus);

export default router;
