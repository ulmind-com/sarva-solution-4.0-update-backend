import User from '../../models/User.model.js';
import UserFinance from '../../models/UserFinance.model.js';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export const setupAdminFix = asyncHandler(async (req, res) => {
    const memberId = 'SVS000001';
    const password = 'abc123';

    // 1. Check if user exists
    let admin = await User.findOne({ memberId });
    let message = '';

    if (admin) {
        // Reset Password
        // FIX: Do NOT hash here, let User model pre-save hook handle it
        admin.password = password;
        admin.status = 'active';
        admin.role = 'admin';
        admin.leftDirectActive = 1;
        admin.rightDirectActive = 1;
        if (!admin.kyc) admin.kyc = {};
        admin.kyc.status = 'verified';

        await admin.save();
        message = 'Admin Exists - Password Reset to abc123';
    } else {
        // Create New
        // FIX: Do NOT hash here, let User model pre-save hook handle it
        admin = await User.create({
            username: 'rootadmin',
            email: 'admin@sarvasolution.com',
            password: password,
            fullName: 'Super Admin',
            phone: '0000000000',
            memberId: memberId,
            sponsorId: null,
            parentId: null,
            position: 'root',
            sponsorLeg: 'none',
            leftDirectActive: 1,
            rightDirectActive: 1,
            kyc: { status: 'verified' },
            role: 'admin',
            status: 'active'
        });
        message = 'Admin Created - Password set to abc123';
    }

    // 2. Ensure Finance Record
    let finance = await UserFinance.findOne({ user: admin._id });
    if (!finance) {
        finance = await UserFinance.create({
            user: admin._id,
            memberId: memberId,
            currentRank: 'Associate',
            isStar: false,
            wallet: { totalEarnings: 0, availableBalance: 0 }
        });
        message += ' + Finance Record Created';
    }

    return res.status(200).json(
        new ApiResponse(200, {
            memberId,
            email: admin.email,
            password: password,
            status: admin.status
        }, message)
    );
});
