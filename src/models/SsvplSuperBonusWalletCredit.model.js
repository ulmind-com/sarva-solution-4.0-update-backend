import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * SsvplSuperBonusWalletCredit
 * -------------------------------------------------
 * Per-user payout audit log for SSVPL Super Bonus (Yearly).
 */
const ssvplSuperBonusWalletCreditSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: String, required: true, index: true },

    cycleYear: { type: Number, required: true },

    leftLegBV:     { type: Number, default: 0 },
    rightLegBV:    { type: Number, default: 0 },
    personalBV:    { type: Number, default: 0 },
    adjustedLeft:  { type: Number, default: 0 },
    adjustedRight: { type: Number, default: 0 },
    finalUnits:    { type: Number, default: 0 },

    poolId:       { type: mongoose.Schema.Types.ObjectId, ref: 'SsvplSuperBonusPool', required: true },
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

ssvplSuperBonusWalletCreditSchema.index({ userId: 1, cycleYear: 1 }, { unique: true });

const SsvplSuperBonusWalletCredit = mongoose.model('SsvplSuperBonusWalletCredit', ssvplSuperBonusWalletCreditSchema);
export default SsvplSuperBonusWalletCredit;
