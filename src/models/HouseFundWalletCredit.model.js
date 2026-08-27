import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * HouseFundWalletCredit
 * -------------------------------------------------
 * Per-user payout audit log for House Fund (Half-Yearly).
 */
const houseFundWalletCreditSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: String, required: true, index: true },

    cycleYear:   { type: Number, required: true },
    cycleNumber: { type: Number, required: true, enum: [1, 2] },

    leftLegBV:     { type: Number, default: 0 },
    rightLegBV:    { type: Number, default: 0 },
    personalBV:    { type: Number, default: 0 },
    adjustedLeft:  { type: Number, default: 0 },
    adjustedRight: { type: Number, default: 0 },
    finalUnits:    { type: Number, default: 0 },

    poolId:       { type: mongoose.Schema.Types.ObjectId, ref: 'HouseFundPool', required: true },
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

houseFundWalletCreditSchema.index({ userId: 1, cycleYear: 1, cycleNumber: 1 }, { unique: true });

const HouseFundWalletCredit = mongoose.model('HouseFundWalletCredit', houseFundWalletCreditSchema);
export default HouseFundWalletCredit;
