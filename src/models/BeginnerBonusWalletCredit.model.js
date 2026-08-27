import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * BeginnerBonusWalletCredit
 * -------------------------------------------------
 * One document per user per month.
 * Audit log for every individual Beginner Bonus payout credited to a user's wallet.
 */
const beginnerBonusWalletCreditSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: String, required: true, index: true },

    year:  { type: Number, required: true },
    month: { type: Number, required: true },

    // Unit breakdown
    leftLegBV:    { type: Number, default: 0 }, // Raw left leg BV (inc carry-forward)
    rightLegBV:   { type: Number, default: 0 }, // Raw right leg BV (inc carry-forward)
    personalBV:   { type: Number, default: 0 }, // User's own purchase BV added to weaker leg
    adjustedLeft:  { type: Number, default: 0 }, // leftBV after personal BV add-on
    adjustedRight: { type: Number, default: 0 }, // rightBV after personal BV add-on
    finalUnits:   { type: Number, default: 0 }, // After capping at 10

    // Payment breakdown
    poolId:      { type: mongoose.Schema.Types.ObjectId, ref: 'BeginnerBonusPool', required: true },
    perUnitValue:  { type: Number, default: 0 },
    grossCredit:   { type: Number, default: 0 },  // perUnitValue × finalUnits
    adminCharge:   { type: Number, default: 0 },  // 5%
    tds:           { type: Number, default: 0 },  // 2%
    netCredit:     { type: Number, default: 0 },  // grossCredit × 0.93

    creditedAt: { type: Date, default: null },

    // IST audit
    createdAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    }
}, { timestamps: true });

// Unique: one credit entry per user per month
beginnerBonusWalletCreditSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

const BeginnerBonusWalletCredit = mongoose.model('BeginnerBonusWalletCredit', beginnerBonusWalletCreditSchema);
export default BeginnerBonusWalletCredit;
