import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * HouseFundPool
 * -------------------------------------------------
 * One document per Half-Yearly Cycle.
 * Cycle 1: April 1 - Sept 30
 * Cycle 2: Oct 1 - March 31
 *
 * Pool = 3% of companyTotalBV (fresh purchases over 6 months).
 * Units: 2,50,000 BV = 1 Unit. No capping.
 */
const houseFundPoolSchema = new mongoose.Schema({
    cycleYear:   { type: Number, required: true }, // e.g., 2026 for Apr-Sept 2026
    cycleNumber: { type: Number, required: true, enum: [1, 2] }, // 1 or 2

    companyTotalBV: { type: Number, required: true, default: 0 },

    poolPercent: { type: Number, default: 3 },
    poolAmount:  { type: Number, default: 0 },

    totalUnits:        { type: Number, default: 0 },
    perUnitValue:      { type: Number, default: 0 },
    eligibleUserCount: { type: Number, default: 0 },
    eligibleUserIds:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    adminChargePercent: { type: Number, default: 10 },
    tdsPercent:         { type: Number, default: 2 },
    totalDeductionPct:  { type: Number, default: 7 },

    status: {
        type: String,
        enum: ['pending', 'distributed', 'held'],
        default: 'pending'
    },

    distributedAt: { type: Date, default: null },
    notes: { type: String, default: '' },

    createdAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    },
    updatedAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    }
}, { timestamps: true });

houseFundPoolSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    next();
});

houseFundPoolSchema.index({ cycleYear: 1, cycleNumber: 1 }, { unique: true });

const HouseFundPool = mongoose.model('HouseFundPool', houseFundPoolSchema);
export default HouseFundPool;
