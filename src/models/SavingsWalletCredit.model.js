import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * SavingsWalletCredit
 * -------------------------------------------------
 * Audit log for every credit into the isolated Savings Wallet.
 * One document per income event that contributes the extra 10% (of gross).
 */
const savingsWalletCreditSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    memberId: { type: String, required: true, index: true },

    sourceType:  { type: String, required: true },                                  // income/payoutType that triggered it
    sourceRefId: { type: mongoose.Schema.Types.ObjectId, default: null },           // optional Payout / WalletCredit id

    grossAmount:  { type: Number, required: true },
    percent:      { type: Number, default: 10 },
    amount:       { type: Number, required: true },                                 // credited to savings wallet
    balanceAfter: { type: Number, default: 0 },

    createdAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    }
}, { timestamps: true });

savingsWalletCreditSchema.index({ userId: 1, createdAt: -1 });

const SavingsWalletCredit = mongoose.model('SavingsWalletCredit', savingsWalletCreditSchema);
export default SavingsWalletCredit;
