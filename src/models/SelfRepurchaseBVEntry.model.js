import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * SelfRepurchaseBVEntry
 * -------------------------------------------------
 * Records every BV contribution from a user's repurchase
 * (2nd purchase onwards) for Self Repurchase Bonus tracking.
 *
 * One document is created per sale event where isFirstPurchase=false.
 * The `isInEligibilityWindow` flag marks purchases made on day 1–10
 * of the calendar month (IST), which is what determines eligibility
 * for the monthly bonus pool.
 *
 * DO NOT modify (append only).
 */
const selfRepurchaseBVEntrySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    memberId: {
        type: String,
        required: true,
        index: true
    },

    // Reference to FranchiseSale.saleNo that generated this BV
    saleId: {
        type: String,
        required: true,
        unique: true // One entry per sale, prevents duplicates
    },

    bvAmount: {
        type: Number,
        required: true,
        min: 0
    },

    // IST date/time of the purchase (for eligibility window calculation)
    purchaseDate: {
        type: Date,
        required: true
    },

    // Calendar month/year in IST (1-indexed)
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },

    // True if purchaseDate falls on day 1–10 of the calendar month (IST)
    // This is what makes the user eligible for the 500 BV pool requirement
    isInEligibilityWindow: {
        type: Boolean,
        required: true,
        default: false
    },

    // IST Timezone Fields
    createdAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    }
}, {
    timestamps: true
});

// Compound indexes for aggregation queries
selfRepurchaseBVEntrySchema.index({ userId: 1, year: 1, month: 1 });
selfRepurchaseBVEntrySchema.index({ year: 1, month: 1 }); // Company-wide monthly total
selfRepurchaseBVEntrySchema.index({ userId: 1, year: 1, month: 1, isInEligibilityWindow: 1 }); // Eligibility check

const SelfRepurchaseBVEntry = mongoose.model('SelfRepurchaseBVEntry', selfRepurchaseBVEntrySchema);
export default SelfRepurchaseBVEntry;
