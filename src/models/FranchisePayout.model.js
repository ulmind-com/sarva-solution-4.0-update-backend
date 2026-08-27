import mongoose from 'mongoose';

const franchisePayoutSchema = new mongoose.Schema({
    franchiseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise',
        required: true,
        index: true
    },
    // Tracks the historical period
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    
    // Financial Mathematics
    payoutType: {
        type: String,
        enum: ['BV', 'PV'],
        default: 'BV'
    },
    totalBv: { type: Number, default: 0 },
    totalPv: { type: Number, default: 0 },
    grossPayout: { type: Number, required: true, default: 0 }, // 10% of totalBv OR (totalPv * 40)
    adminCharge: { type: Number, required: true, default: 0 }, // 5% of grossPayout
    tdsCharge: { type: Number, required: true, default: 0 },   // 2% of grossPayout
    netPayout: { type: Number, required: true, default: 0 },   // gross - admin - tds
    
    // Payment Tracking
    status: {
        type: String,
        enum: ['pending', 'paid', 'overridden'],
        default: 'pending',
        index: true
    },
    paidAt: { type: Date, default: null },
    transactionRef: { type: String, default: null }, // Optional tracking ID for actual fiat transfer
    paidByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }

}, {
    timestamps: true
});

// Composite index to prevent duplicate payouts for the same month AND SAME TYPE
franchisePayoutSchema.index({ franchiseId: 1, month: 1, year: 1, payoutType: 1 }, { unique: true });

const FranchisePayout = mongoose.model('FranchisePayout', franchisePayoutSchema);
export default FranchisePayout;
