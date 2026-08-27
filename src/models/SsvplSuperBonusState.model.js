import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * SsvplSuperBonusState
 * -------------------------------------------------
 * Per-user carry-forward state for SSVPL Super Bonus (Yearly Cycle).
 * Cycle runs: April 1st to March 31st. (e.g., Cycle 2026 ends March 31, 2026).
 *
 * Rules: 25,00,000 BV = 1 Unit | No capping | 2% of company BV pooled
 */
const ssvplSuperBonusStateSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    memberId: { type: String, required: true, index: true },

    carryForwardLeft:  { type: Number, default: 0 },
    carryForwardRight: { type: Number, default: 0 },

    lastProcessedCycleYear: { type: Number, default: null }, // e.g., 2026

    updatedAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    }
}, { timestamps: true });

ssvplSuperBonusStateSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    next();
});

const SsvplSuperBonusState = mongoose.model('SsvplSuperBonusState', ssvplSuperBonusStateSchema);
export default SsvplSuperBonusState;
