import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * StartUpBonusWalletCredit
 * -------------------------------------------------
 * One document per user per month.
 * Audit log for every individual Start Up Bonus payout credited to a user's wallet.
 */
const startUpBonusWalletCreditSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: String, required: true, index: true },

    year:  { type: Number, required: true },
    month: { type: Number, required: true },

    leftLegBV:     { type: Number, default: 0 },
    rightLegBV:    { type: Number, default: 0 },
    personalBV:    { type: Number, default: 0 },
    adjustedLeft:  { type: Number, default: 0 },
    adjustedRight: { type: Number, default: 0 },
    finalUnits:    { type: Number, default: 0 }, // No capping — can be any value

    poolId:       { type: mongoose.Schema.Types.ObjectId, ref: 'StartUpBonusPool', required: true },
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

startUpBonusWalletCreditSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

const StartUpBonusWalletCredit = mongoose.model('StartUpBonusWalletCredit', startUpBonusWalletCreditSchema);
export default StartUpBonusWalletCredit;
