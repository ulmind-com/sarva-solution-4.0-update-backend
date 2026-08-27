import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * TourFundPool
 * -------------------------------------------------
 * One document per calendar month.
 * Pool = 6% of companyTotalBV (fresh purchases only — carry-forwards excluded).
 * Units: 25,000 BV = 1 Unit. No capping.
 * Net credited = gross × 0.93 (5% admin + 2% TDS deducted).
 * Status flow: pending → distributed | held
 */
const tourFundPoolSchema = new mongoose.Schema({
    year:  { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },

    companyTotalBV: { type: Number, required: true, default: 0 },

    poolPercent: { type: Number, default: 6 },
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

tourFundPoolSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    next();
});

tourFundPoolSchema.index({ year: 1, month: 1 }, { unique: true });

const TourFundPool = mongoose.model('TourFundPool', tourFundPoolSchema);
export default TourFundPool;
