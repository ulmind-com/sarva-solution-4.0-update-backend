import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * HouseFundState
 * -------------------------------------------------
 * Per-user carry-forward state for House Fund (Half-Yearly Cycle).
 * Cycle 1: April 1 - Sept 30
 * Cycle 2: Oct 1 - March 31
 *
 * Rules: 2,50,000 BV = 1 Unit | No capping | 3% of company BV pooled
 */
const houseFundStateSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    memberId: { type: String, required: true, index: true },

    carryForwardLeft:  { type: Number, default: 0 },
    carryForwardRight: { type: Number, default: 0 },

    lastProcessedCycleYear:   { type: Number, default: null }, // e.g., 2026
    lastProcessedCycleNumber: { type: Number, default: null }, // 1 (Apr-Sept) or 2 (Oct-Mar)

    updatedAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    }
}, { timestamps: true });

houseFundStateSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    next();
});

const HouseFundState = mongoose.model('HouseFundState', houseFundStateSchema);
export default HouseFundState;
