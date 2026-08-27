import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * SavingsWallet
 * -------------------------------------------------
 * ISOLATED feature wallet.
 * On every user income, an extra 10% of the GROSS amount is diverted here
 * (separate from the existing main wallet / TDS / admin charge logic).
 * Deposit-only: there is no withdrawal flow on this wallet.
 */
const savingsWalletSchema = new mongoose.Schema({
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true, index: true },
    memberId: { type: String, required: true, index: true },

    balance:       { type: Number, default: 0 },
    totalCredited: { type: Number, default: 0 },

    createdAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    }
}, { timestamps: true });

const SavingsWallet = mongoose.model('SavingsWallet', savingsWalletSchema);
export default SavingsWallet;
