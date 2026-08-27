import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * SelfRepurchaseBonusPool
 * -------------------------------------------------
 * One document per calendar month. Stores the computed pool and
 * distribution result for the Self Repurchase Bonus.
 *
 * Pool = 7% of companyTotalBV (in taka value).
 * Each eligible user (≥500 BV in the 1–10 window) receives an equal share.
 * Net credited = gross × 0.93 (5% admin + 2% TDS deducted).
 *
 * Status flow: pending → distributed | held
 * 'held' = no eligible users found; pool is frozen for that month.
 */
const selfRepurchaseBonusPoolSchema = new mongoose.Schema({
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 }, // 1-indexed

    // Aggregate BV for that calendar month (ALL users, ALL days)
    companyTotalBV: { type: Number, required: true, default: 0 },

    // Pool computations
    poolPercent:      { type: Number, default: 7 },   // 7% — stored for audit
    poolAmount:       { type: Number, default: 0 },   // companyTotalBV × 0.07

    eligibleUserCount:    { type: Number, default: 0 },
    grossSharePerUser:    { type: Number, default: 0 }, // poolAmount ÷ eligibleUserCount

    // Deduction rates (stored for audit — never change the math retrospectively)
    adminChargePercent: { type: Number, default: 10 },
    tdsPercent:         { type: Number, default: 2 },
    totalDeductionPct:  { type: Number, default: 7 }, // adminCharge + tds

    netSharePerUser: { type: Number, default: 0 }, // grossShare × 0.93

    // Snapshot of which users received credit
    eligibleUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    status: {
        type: String,
        enum: ['pending', 'distributed', 'held'],
        default: 'pending'
    },

    // Populated when distribution runs
    distributedAt: { type: Date, default: null },

    // Notes (e.g. why it was held)
    notes: { type: String, default: '' },

    // IST Timezone Fields
    createdAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    },
    updatedAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    }
}, {
    timestamps: true
});

selfRepurchaseBonusPoolSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    next();
});

// Unique index — only one pool record per month
selfRepurchaseBonusPoolSchema.index({ year: 1, month: 1 }, { unique: true });

const SelfRepurchaseBonusPool = mongoose.model('SelfRepurchaseBonusPool', selfRepurchaseBonusPoolSchema);
export default SelfRepurchaseBonusPool;
