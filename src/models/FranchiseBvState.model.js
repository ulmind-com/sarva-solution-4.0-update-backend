import mongoose from 'mongoose';

const franchiseBvStateSchema = new mongoose.Schema({
    franchiseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise',
        required: true,
        unique: true,
        index: true
    },
    // Lifetime accumulation of Repurchase BV
    lifetimeRepurchaseBv: {
        type: Number,
        default: 0
    },
    // Transitory accumulation for the current calendar month
    currentMonthRepurchaseBv: {
        type: Number,
        default: 0
    },
    // Lifetime accumulation of 1st Purchase PV (Activation)
    lifetimeFirstPurchasePv: {
        type: Number,
        default: 0
    },
    // Transitory accumulation for the current calendar month
    currentMonthFirstPurchasePv: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const FranchiseBvState = mongoose.model('FranchiseBvState', franchiseBvStateSchema);
export default FranchiseBvState;
