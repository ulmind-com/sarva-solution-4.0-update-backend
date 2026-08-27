import mongoose from 'mongoose';

const walletAdjustmentLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: String, required: true, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['Credit', 'Debit'], required: true },
    amount: { type: Number, required: true, min: 1 },
    previousBalance: { type: Number, required: true },
    newBalance: { type: Number, required: true },
    remarks: { type: String },
}, { timestamps: true });

const WalletAdjustmentLog = mongoose.model('WalletAdjustmentLog', walletAdjustmentLogSchema);

export default WalletAdjustmentLog;
