import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import moment from 'moment-timezone';

import { addressSchema } from './schemas/address.schema.js';
import { kycSchema } from './schemas/kyc.schema.js';
import { fundSchema } from './schemas/fund.schema.js';
import { rankSchema } from './schemas/rank.schema.js';

const userSchema = new mongoose.Schema({
    // Basic Information
    username: { type: String, trim: true, lowercase: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    panCardNumber: { type: String, trim: true, uppercase: true },

    // MLM Structure
    memberId: { type: String, unique: true, required: true },
    sponsorId: { type: String, default: null },
    parentId: { type: String, default: null },
    position: { type: String, enum: ['left', 'right', 'root'], default: null },
    sponsorLeg: { type: String, enum: ['left', 'right', 'none'], default: 'none' }, // New: Which leg of the sponsor this user is in
    leftChild: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rightChild: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Password Reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // BV Tracking System (SSVPL Standard)
    personalBV: { type: Number, default: 0 },
    leftLegBV: { type: Number, default: 0 },
    rightLegBV: { type: Number, default: 0 },

    // PV Tracking System (New)
    personalPV: { type: Number, default: 0 },
    leftLegPV: { type: Number, default: 0 },
    rightLegPV: { type: Number, default: 0 },
    totalPV: { type: Number, default: 0 },
    thisMonthPV: { type: Number, default: 0 },
    thisYearPV: { type: Number, default: 0 },

    // Direct Sponsor Breakdown
    leftDirectActive: { type: Number, default: 0 },
    leftDirectInactive: { type: Number, default: 0 },
    rightDirectActive: { type: Number, default: 0 },
    rightDirectInactive: { type: Number, default: 0 },

    // Total Team Counts (Recursive)
    leftTeamCount: { type: Number, default: 0 }, // Total (Active + Inactive)
    rightTeamCount: { type: Number, default: 0 },

    // Detailed Recursive Counts (Added for Tree View)
    leftTeamActive: { type: Number, default: 0 },
    leftTeamInactive: { type: Number, default: 0 },
    rightTeamActive: { type: Number, default: 0 },
    rightTeamInactive: { type: Number, default: 0 },

    totalBV: { type: Number, default: 0 },
    thisMonthBV: { type: Number, default: 0 },
    thisYearBV: { type: Number, default: 0 },
    carryForwardLeft: { type: Number, default: 0 },
    carryForwardRight: { type: Number, default: 0 },
    lastBVUpdate: { type: Date, default: Date.now },

    // 4 Fund Systems (Modularized)
    bikeCarFund: { type: fundSchema, default: () => ({ nextTargetBV: 100000 }) },
    houseFund: { type: fundSchema, default: () => ({ nextTargetBV: 250000, paymentSchedule: 'half-yearly' }) },
    royaltyFund: { type: fundSchema, default: () => ({ nextTargetBV: 750000, paymentSchedule: 'annual' }) },
    ssvplSuperBonus: { type: fundSchema, default: () => ({ nextTargetBV: 2500000 }) },

    // 13 Rank System (Modularized context - embedding schema fields directly or using subdocument? 
    // Mongoose allows nesting schemas. Let's use the spread if we want flat or nested if we want object.
    // Original was flat 'currentRank', 'rankNumber' etc.
    // BUT 'rankHistory' was array.
    // To keep backward compatibility, we can't easily wrap them in a 'rankDetails' object unless we migrate data.
    // DECISION: KEEP FLAT STRUCTURE for now to avoid data migration issues, but use schema definition parts or simpler:
    // Actually, modularizing 'rankSchema' as a subdoc is good for new structure, but breaking for 'currentRank' at root.
    // Let's keep the fields effectively but defined via our cohesive schema approach? 
    // No, Mongoose doesn't support "spreading" a schema into root easily like that without plugins.
    // Strategy: We will define the fields here matching the schema logic, OR we accept that we might need to wrap them in future.
    // User requested "modular separate normalize".
    // Best approach: Use the `rankSchema` as a subdocument `rank`? No, existing code queries `user.currentRank`.
    // OK, we must preserve the field paths: `currentRank`, `rankNumber`, `starMatching` etc. 
    // So we cannot strictly "use" the `rankSchema` object here unless we change code everywhere.
    // EXCEPT: The user explicitly asked for "modular" and "normalization". 
    // And "existing data should be there in proper format".
    // If we change structure, we break existing data access unless we migrate.
    // Let's keep definitions here but cleaner? Or just use the sub-parts that are objects.
    // `rankHistory` IS an array of objects.
    // `currentRank` is a specific field.
    // Let's Refactor: We will use the explicit definitions here to match the `rankSchema` INTENTION, 
    // but we can't replace root fields with a subdoc without migration.
    // wait, `bikeCarFund` etc ARE objects. So `type: fundSchema` works perfectly there.
    // For `currentRank`, it's a root field. 
    // We will leave the Rank fields as is in User, but use `fundSchema` for funds.
    // And `kyc` object can use `kycSchema`.
    // And `address` object can use `addressSchema`.

    // Rank Fields (Kept at root for compatibility, but structured)
    currentRank: {
        type: String,
        default: 'Associate',
        enum: [
            'Associate', 'Star', 'Bronze', 'Silver', 'Gold', 'Platinum',
            'Diamond', 'Blue Diamond', 'Black Diamond', 'Royal Diamond',
            'Crown Diamond', 'Ambassador', 'Crown Ambassador', 'SSVPL Legend'
        ]
    },
    rankNumber: { type: Number, default: 14 },
    starMatching: { type: Number, default: 0 },
    rankBonus: { type: Number, default: 0 },
    achievedDate: Date,
    nextRankRequirement: { type: String },
    rankHistory: [{
        rank: String,
        date: { type: Date, default: Date.now }
    }],

    // Repurchase Bonus Tracking
    selfPurchase: {
        totalPurchases: { type: Number, default: 0 },
        lastPurchaseDate: Date,
        thisMonthBV: { type: Number, default: 0 },
        bonusEarned: { type: Number, default: 0 },
        eligibleForPrize: { type: Boolean, default: false }
    },
    isFirstPurchaseDone: { type: Boolean, default: false },
    activationDate: { type: Date, default: null },
    beginnerBonus: {
        units: { type: Number, default: 0 },
        cappingReached: { type: Number, default: 0 },
        cappingLimit: { type: Number, default: 10 },
        totalBV: { type: Number, default: 0 }
    },
    startUpBonus: { units: { type: Number, default: 0 }, totalBV: { type: Number, default: 0 } },
    leadershipBonus: { units: { type: Number, default: 0 }, totalBV: { type: Number, default: 0 } },
    tourFund: { units: { type: Number, default: 0 }, totalBV: { type: Number, default: 0 } },
    healthEducation: { units: { type: Number, default: 0 }, totalBV: { type: Number, default: 0 } },

    // Bonus Income Tracking
    fastTrack: {
        dailyEarnings: { type: Number, default: 0 },
        weeklyEarnings: { type: Number, default: 0 },
        monthlyEarnings: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        dailyClosings: { type: Number, default: 0 }
    },
    starMatchingBonus: {
        dailyEarnings: { type: Number, default: 0 },
        weeklyEarnings: { type: Number, default: 0 },
        monthlyEarnings: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        dailyClosings: { type: Number, default: 0 }
    },

    // Stock Points
    lsp: {
        achieved: { type: Boolean, default: false },
        achievedDate: Date,
        currentBV: { type: Number, default: 0 },
        targetBV: { type: Number, default: 100000 }
    },
    msp: {
        achieved: { type: Boolean, default: false },
        achievedDate: Date,
        currentBV: { type: Number, default: 0 },
        targetBV: { type: Number, default: 500000 }
    },

    // Compliance & Wallet
    directSponsors: {
        count: { type: Number, default: 0 },
        // members: [{ type: String }], // REMOVED for Scalability
        eligibleForBonuses: { type: Boolean, default: false }
    },
    compliance: {
        minimumWithdrawal: { type: Number, default: 450 },
        adminChargePercent: { type: Number, default: 5 },
        tdsPercent: { type: Number, default: 0 },
        autoRankUpgrade: { type: Boolean, default: true }
    },
    wallet: {
        totalEarnings: { type: Number, default: 0 },
        availableBalance: { type: Number, default: 0 },
        withdrawnAmount: { type: Number, default: 0 },
        pendingWithdrawal: { type: Number, default: 0 }
    },

    // Profile & KYC (Modularized)
    address: { type: addressSchema, default: {} },
    kyc: { type: kycSchema, default: {} },

    // Nominee Details
    nominee: {
        name: { type: String, trim: true },
        relation: { type: String, trim: true },
        dateOfBirth: { type: Date }
    },

    profilePicture: {
        url: { type: String, default: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT11ii7P372sU9BZPZgOR6ohoQbBJWbkJ0OVA&s' },
        publicId: { type: String, default: null }
    },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'inactive' },

    // Timezone Fields
    createdAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') },
    updatedAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') }

}, {
    timestamps: true
});

userSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
    next();
});

// Password Hashing
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

// Compare Password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate Reset Password Token
userSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash and set to resetPasswordToken
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire (10 minutes)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

// Generate unique member ID (Random 8 digits)
userSchema.statics.generateMemberId = async function () {
    let uniqueId, existingUser;

    // Retry loop to ensure uniqueness
    do {
        const randomNum = Math.floor(10000000 + Math.random() * 90000000); // 8-digit random number
        uniqueId = `SVS${randomNum}`;
        existingUser = await this.findOne({ memberId: uniqueId });
    } while (existingUser);

    return uniqueId;
};

// Indexes
userSchema.index({ sponsorId: 1, sponsorLeg: 1 }); // Compound index for filtering direct team by leg
userSchema.index({ parentId: 1 });
userSchema.index({ panCardNumber: 1 });
userSchema.index({ email: 1 });
userSchema.index({ status: 1, isFirstPurchaseDone: 1 }); // Bonus service: find all active users with first purchase
userSchema.index({ leftChild: 1 });  // Tree traversal lookup
userSchema.index({ rightChild: 1 }); // Tree traversal lookup

const User = mongoose.model('User', userSchema);
export default User;
