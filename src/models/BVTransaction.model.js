import mongoose from 'mongoose';
import moment from 'moment-timezone';

const bvTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transactionType: {
        type: String,
        required: true,
        enum: ['joining', 'repurchase', 'downline', 'admin-adjustment', 'first-purchase']
    },
    bvAmount: { type: Number, required: true },
    legAffected: {
        type: String,
        enum: ['left', 'right', 'personal', 'none'],
        default: 'none'
    },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Source of downline BV
    description: String,
    referenceId: String, // e.g., OrderId or RegistrationId

    // Timezone Fields
    createdAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') },
    updatedAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') }

}, {
    timestamps: true
});

bvTransactionSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
    next();
});

bvTransactionSchema.index({ userId: 1, createdAt: -1 });

const BVTransaction = mongoose.model('BVTransaction', bvTransactionSchema);
export default BVTransaction;
