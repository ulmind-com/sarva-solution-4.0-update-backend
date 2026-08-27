import UserFinance from '../../models/UserFinance.model.js';
import User from '../../models/User.model.js';
import { mailer } from '../../services/integration/mail.service.js';
import { mlmService } from '../../services/business/mlm.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { assertPhoneVerified, consumeVerifiedOtp } from './otp.controller.js';
import jwt from 'jsonwebtoken';

// Phone OTP verification is enforced by default; can be disabled via env if needed.
const OTP_VERIFICATION_REQUIRED = (process.env.OTP_VERIFICATION_REQUIRED || 'true') !== 'false';

/**
 * Handle new user registration in SSVPL System
 */
export const register = asyncHandler(async (req, res) => {
    const {
        email,
        password,
        fullName,
        phone,
        sponsorId,
        panCardNumber,
        preferredPosition
    } = req.body;

    // 1. Validation
    if (!email || !password || !fullName || !phone || !sponsorId || !panCardNumber) {
        throw new ApiError(400, 'Required: sponsorId, email, phone, fullName, panCardNumber, password.');
    }

    // 1.1 Phone OTP verification gate (tamper-proof — frontend gating alone is bypassable)
    if (OTP_VERIFICATION_REQUIRED) {
        await assertPhoneVerified(phone);
    }

    const phoneCount = await User.countDocuments({ phone });
    if (phoneCount >= 3) throw new ApiError(400, 'Maximum 3 accounts allowed per mobile number');

    // PAN must be unique for new registrations (one PAN = one account going forward).
    // Existing users who already share a PAN are unaffected (no DB unique index added).
    const panCount = await User.countDocuments({ panCardNumber: panCardNumber.toUpperCase() });
    if (panCount >= 1) throw new ApiError(400, 'This PAN card is already registered. Only one account is allowed per PAN card.');

    const sponsor = await User.findOne({ memberId: sponsorId });
    if (!sponsor) throw new ApiError(400, 'Invalid sponsor ID.');

    // 2. Genealogy Placement
    const placement = await mlmService.findAvailablePosition(sponsorId, preferredPosition);
    const memberId = await User.generateMemberId();

    // 3. User Creation (SSVPL default: Inactive)
    const newUser = new User({
        username: memberId,
        email,
        password,
        fullName,
        phone,
        memberId,
        sponsorId,
        panCardNumber: panCardNumber.toUpperCase(),
        parentId: placement.parentId,
        position: placement.position,
        status: 'inactive' // Explicitly set inactive
    });

    await newUser.save();

    // 3.1 Initialize UserFinance (Financial Logic Separation)
    await UserFinance.create({
        user: newUser._id,
        memberId: newUser.memberId
    });

    // 4. Update Sponsor's Direct Sponsors count
    if (sponsor) {
        sponsor.directSponsors.count += 1;
        // sponsor.directSponsors.members.push(newUser.memberId); // REMOVED for Scalability
        // Bonus eligibility check should probably depend on ACTIVE sponsors?
        // Checking rule: "Must have 2 direct sponsors" - typically means active. 
        // We will keep this count as raw count, but eligibility check in calculates matching usually checks active status.
        // For now, let's leave this raw count increment.
        if (sponsor.directSponsors.count >= 2) {
            sponsor.directSponsors.eligibleForBonuses = true;
        }
        await sponsor.save();
    }

    // 5. Update parent's child reference
    const parentNode = await User.findOne({ memberId: placement.parentId });
    if (parentNode) {
        if (placement.position === 'left') {
            parentNode.leftChild = newUser._id;
        } else {
            parentNode.rightChild = newUser._id;
        }
        await parentNode.save();
    }

    // 5. BV Propagation - SKIPPED FOR INACTIVE USER
    // await mlmService.propagateBVUpTree(...) // No BV yet

    // 5.1 Update Sponsor's Direct Count
    await mlmService.updateSponsorDirectCount(newUser);

    // 5.2 Update Total Team Counts (Live Sync)
    await mlmService.updateTeamCountsUpTree(newUser._id);

    // 6. Notifications & JWT
    if (OTP_VERIFICATION_REQUIRED) {
        await consumeVerifiedOtp(phone).catch(e => console.error('OTP cleanup error:', e));
    }

    mailer.sendWelcome(newUser, password).catch(e => console.error('Welcome Email Error:', e));

    const token = jwt.sign(
        { userId: newUser._id, memberId: newUser.memberId, role: newUser.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
    );

    return res.status(201).json(
        new ApiResponse(201, {
            memberId: newUser.memberId,
            fullName: newUser.fullName,
            token
        }, 'Registration successful in SSVPL System')
    );
});
