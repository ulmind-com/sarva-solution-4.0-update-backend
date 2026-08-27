import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * LeadershipBonusWalletCredit
 * -------------------------------------------------
 * Per-user per-month payout audit log for Leadership Bonus.
 * finalUnits has no cap — can be any integer >= 1.
 */
const leadershipBonusWalletCreditSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: String, required: true, index: true },

    year:  { type: Number, required: true },
    month: { type: Number, required: true },

    leftLegBV:     { type: Number, default: 0 },
    rightLegBV:    { type: Number, default: 0 },
    personalBV:    { type: Number, default: 0 },
    adjustedLeft:  { type: Number, default: 0 },
    adjustedRight: { type: Number, default: 0 },
    finalUnits:    { type: Number, default: 0 },

    poolId:       { type: mongoose.Schema.Types.ObjectId, ref: 'LeadershipBonusPool', required: true },
    perUnitValue: { type: Number, default: 0 },
    grossCredit:  { type: Number, default: 0 },
    adminCharge:  { type: Number, default: 0 },
    tds:          { type: Number, default: 0 },
    netCredit:    { type: Number, default: 0 },

    creditedAt: { type: Date, default: null },

    createdAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    }
}, { timestamps: true });

leadershipBonusWalletCreditSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

const LeadershipBonusWalletCredit = mongoose.model('LeadershipBonusWalletCredit', leadershipBonusWalletCreditSchema);
export default LeadershipBonusWalletCredit;
