import mongoose from 'mongoose';

/**
 * SavingsWalletAdjustmentLog
 * -------------------------------------------------
 * Mirror of WalletAdjustmentLog, but for the ISOLATED Savings Wallet.
 * Records every manual Credit/Debit an admin performs on a user's Savings Wallet.
 */
const savingsWalletAdjustmentLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: String, required: true, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['Credit', 'Debit'], required: true },
    amount: { type: Number, required: true, min: 1 },
    previousBalance: { type: Number, required: true },
    newBalance: { type: Number, required: true },
    remarks: { type: String },
}, { timestamps: true });

const SavingsWalletAdjustmentLog = mongoose.model('SavingsWalletAdjustmentLog', savingsWalletAdjustmentLogSchema);

export default SavingsWalletAdjustmentLog;
