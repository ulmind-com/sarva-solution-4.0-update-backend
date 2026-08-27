import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * BeginnerBonusPool
 * -------------------------------------------------
 * One document per calendar month.
 * Stores the pool computation and distribution result for the Beginner Bonus.
 *
 * Pool = 18% of companyTotalBV for that month.
 * Each eligible user earns (perUnitValue × finalUnits) gross, with 7% deduction applied.
 *
 * Status flow: pending → distributed | held
 * 'held' = no eligible users found; pool is frozen for that month.
 */
const beginnerBonusPoolSchema = new mongoose.Schema({
    year:  { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 }, // 1-indexed

    // Company-wide fresh BV for this month (carry-forwards excluded)
    companyTotalBV: { type: Number, required: true, default: 0 },

    // Pool computations
    poolPercent: { type: Number, default: 18 },    // 18% — stored for audit
    poolAmount:  { type: Number, default: 0 },     // companyTotalBV × 0.18

    totalUnits:        { type: Number, default: 0 }, // Sum of all user finalUnits
    perUnitValue:      { type: Number, default: 0 }, // poolAmount ÷ totalUnits

    eligibleUserCount: { type: Number, default: 0 },
    eligibleUserIds:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Deduction rates (stored for audit — never change the math retrospectively)
    adminChargePercent: { type: Number, default: 10 },
    tdsPercent:         { type: Number, default: 2 },
    totalDeductionPct:  { type: Number, default: 7 },  // admin + tds

    status: {
        type: String,
        enum: ['pending', 'distributed', 'held'],
        default: 'pending'
    },

    distributedAt: { type: Date, default: null },
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
}, { timestamps: true });

beginnerBonusPoolSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    next();
});

// Unique index — only one pool record per month
beginnerBonusPoolSchema.index({ year: 1, month: 1 }, { unique: true });

const BeginnerBonusPool = mongoose.model('BeginnerBonusPool', beginnerBonusPoolSchema);
export default BeginnerBonusPool;
