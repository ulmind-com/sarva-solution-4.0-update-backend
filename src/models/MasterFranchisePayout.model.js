import mongoose from 'mongoose';
import moment from 'moment-timezone';

const masterFranchisePayoutSchema = new mongoose.Schema({
    masterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise',
        required: true,
        index: true
    },
    sourceFranchiseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise',
        default: null, // Null means it's the Master's Own Differential Payout
        index: true
    },
    earningType: {
        type: String,
        enum: ['OWN_DIFFERENTIAL', 'SUB_OVERRIDE'],
        required: true
    },
    month: {
        type: Number,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    
    // Base Metrics (Used for calculation logging)
    baseBv: { type: Number, default: 0 },
    basePv: { type: Number, default: 0 },

    // Financials
    grossPayout: { type: Number, required: true },
    adminCharge: { type: Number, required: true },
    tdsCharge: { type: Number, required: true },
    netPayout: { type: Number, required: true },

    status: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
    },
    paidAt: {
        type: Date
    },
    transactionId: {
        type: String,
        trim: true
    },
    paymentNotes: {
        type: String
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Admin ID
    },

    // Timezone Fields
    createdAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') },
    updatedAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') }
}, {
    timestamps: true
});

masterFranchisePayoutSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
    next();
});

// Prevent duplicate generation for the same master->source combo in a single month
masterFranchisePayoutSchema.index({ masterId: 1, sourceFranchiseId: 1, earningType: 1, month: 1, year: 1 }, { unique: true });

const MasterFranchisePayout = mongoose.model('MasterFranchisePayout', masterFranchisePayoutSchema);
export default MasterFranchisePayout;
