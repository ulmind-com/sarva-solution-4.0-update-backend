import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { fundSchema } from './schemas/fund.schema.js';

const userFinanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    memberId: { type: String, unique: true, required: true, index: true }, // Redundant but useful for quick lookups

    // BV Tracking System (SSVPL Standard)
    personalBV: { type: Number, default: 0 },
    leftLegBV: { type: Number, default: 0 },
    rightLegBV: { type: Number, default: 0 },
    totalBV: { type: Number, default: 0 }, // Cumulative
    thisMonthBV: { type: Number, default: 0 },
    thisYearBV: { type: Number, default: 0 },
    carryForwardLeft: { type: Number, default: 0 },
    carryForwardRight: { type: Number, default: 0 },
    lastBVUpdate: { type: Date, default: Date.now },

    // PV Tracking System
    personalPV: { type: Number, default: 0 },
    leftLegPV: { type: Number, default: 0 },
    rightLegPV: { type: Number, default: 0 },
    totalPV: { type: Number, default: 0 },
    thisMonthPV: { type: Number, default: 0 },
    thisYearPV: { type: Number, default: 0 },

    // Wallet
    wallet: {
        totalEarnings: { type: Number, default: 0 },
        availableBalance: { type: Number, default: 0 },
        withdrawnAmount: { type: Number, default: 0 },
        pendingWithdrawal: { type: Number, default: 0 }
    },

    // 13 Rank System
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
    starMatching: { type: Number, default: 0 }, // Cumulative (Legacy/Total)
    currentRankMatchCount: { type: Number, default: 0 }, // For "Next Basis" Rank Calculation
    isStar: { type: Boolean, default: false }, // User becomes Star after 12th pair deduction
    rankBonus: { type: Number, default: 0 }, // Total rank bonus earned
    achievedDate: Date,
    nextRankRequirement: { type: String },
    rankHistory: [{
        rank: String,
        date: { type: Date, default: Date.now }
    }],
    
    // Isolated Rank System
    isolatedRank: {
        type: String,
        default: 'Associate',
        enum: [
            'Associate', 'Bronze', 'Silver', 'Gold', 'Platinum',
            'Diamond', 'Ruby', 'Sapphire', 'Emerald',
            'Crown', 'Elite', 'Royal', 'Legend', 'SSVPL Legend', 'SSVPL Master'
        ]
    },
    isolatedRankHistory: [{
        rank: String,
        date: { type: Date, default: Date.now }
    }],

    // 4 Fund Systems (Modularized)
    bikeCarFund: { type: fundSchema, default: () => ({ nextTargetBV: 100000 }) },
    houseFund: { type: fundSchema, default: () => ({ nextTargetBV: 250000, paymentSchedule: 'half-yearly' }) },
    royaltyFund: { type: fundSchema, default: () => ({ nextTargetBV: 750000, paymentSchedule: 'annual' }) },
    ssvplSuperBonus: { type: fundSchema, default: () => ({ nextTargetBV: 2500000 }) },

    // Repurchase & Other Bonuses
    selfPurchase: {
        totalPurchases: { type: Number, default: 0 },
        lastPurchaseDate: Date,
        thisMonthBV: { type: Number, default: 0 },
        bonusEarned: { type: Number, default: 0 },
        eligibleForPrize: { type: Boolean, default: false }
    },
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

    // Tracking
    // Fast Track Bonus (Time-Sensitive Matching)
    fastTrack: {
        lastClosingTime: { type: Date, default: null },
        dailyClosings: { type: Number, default: 0 }, // Max 6
        pendingPairLeft: { type: Number, default: 0 }, // PV Buffer for 4hr window
        pendingPairRight: { type: Number, default: 0 },
        carryForwardLeft: { type: Number, default: 0 }, // Official Carry Forward
        carryForwardRight: { type: Number, default: 0 }, // Should we use the root level ones? Let's keep specific ones here or use root.
        // Logic check: "Power side PV carry forward". Root level `leftLegPV` accumulates TOTAL.
        // Carry forward usually tracks UNMATCHED volume. 
        // Let's use specific fields here for clarity and avoid conflict with standard MLM service.
        // closingHistory: REMOVED for Scalability (Use Payouts for history)
        weeklyEarnings: { type: Number, default: 0 }
    },
    // Star Matching Bonus (Rank Based)
    starMatchingBonus: {
        lastClosingTime: { type: Date, default: null },
        dailyClosings: { type: Number, default: 0 }, // Max 6
        pendingStarsLeft: { type: Number, default: 0 },
        pendingStarsRight: { type: Number, default: 0 },
        carryForwardStarsLeft: { type: Number, default: 0 },
        carryForwardStarsRight: { type: Number, default: 0 },
        // closingHistory: REMOVED for Scalability
        weeklyEarnings: { type: Number, default: 0 }
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
    }

    // Timezone Fields
    , createdAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') },
    updatedAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') }

}, {
    timestamps: true
});

userFinanceSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
    next();
});

const UserFinance = mongoose.model('UserFinance', userFinanceSchema);
export default UserFinance;
