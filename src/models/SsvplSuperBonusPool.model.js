import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * SsvplSuperBonusPool
 * -------------------------------------------------
 * One document per Yearly Cycle.
 * Cycle runs: April 1st to March 31st.
 *
 * Pool = 2% of companyTotalBV (fresh purchases over 12 months).
 * Units: 25,00,000 BV = 1 Unit. No capping.
 */
const ssvplSuperBonusPoolSchema = new mongoose.Schema({
    cycleYear: { type: Number, required: true, unique: true }, // e.g., 2026

    companyTotalBV: { type: Number, required: true, default: 0 },

    poolPercent: { type: Number, default: 2 },
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

ssvplSuperBonusPoolSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    next();
});

const SsvplSuperBonusPool = mongoose.model('SsvplSuperBonusPool', ssvplSuperBonusPoolSchema);
export default SsvplSuperBonusPool;
