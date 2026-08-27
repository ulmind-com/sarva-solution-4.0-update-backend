import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * SelfRepurchaseWalletCredit
 * -------------------------------------------------
 * Immutable audit log. One document per eligible user per month
 * they received a Self Repurchase Bonus credit.
 *
 * Records the full deduction breakdown:
 *   grossAmount = raw equal share from the pool
 *   adminCharge = grossAmount × 0.05
 *   tdsDeducted = grossAmount × 0.02
 *   totalDeduction = grossAmount × 0.07
 *   netAmount = grossAmount × 0.93  ← credited to wallet
 *
 * This record is created AFTER the wallet has been credited.
 */
const selfRepurchaseWalletCreditSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    memberId: {
        type: String,
        required: true,
        index: true
    },

    // Reference to the month's pool document
    poolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SelfRepurchaseBonusPool',
        required: true
    },

    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },

    // Amount breakdown
    grossAmount:    { type: Number, required: true }, // Before deductions
    adminCharge:    { type: Number, required: true }, // 5% of gross
    tdsDeducted:    { type: Number, required: true }, // 2% of gross
    totalDeduction: { type: Number, required: true }, // 7% of gross
    netAmount:      { type: Number, required: true }, // 93% of gross — credited to wallet

    creditedAt: { type: Date, required: true },

    // IST Timezone Fields
    createdAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    }
}, {
    timestamps: true
});

// One credit per user per month (prevents double-crediting)
selfRepurchaseWalletCreditSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });
selfRepurchaseWalletCreditSchema.index({ poolId: 1 });

const SelfRepurchaseWalletCredit = mongoose.model('SelfRepurchaseWalletCredit', selfRepurchaseWalletCreditSchema);
export default SelfRepurchaseWalletCredit;
