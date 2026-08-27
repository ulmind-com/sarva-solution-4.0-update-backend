import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * HealthEducationBonusState
 * -------------------------------------------------
 * Per-user carry-forward state for Health & Education Bonus.
 * After month-end: stronger leg keeps (stronger - weaker) surplus; weaker leg resets to 0.
 *
 * Rules: 50,000 BV = 1 Unit | No capping | 5% of company BV pooled
 */
const healthEducationBonusStateSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    memberId: { type: String, required: true, index: true },

    carryForwardLeft:  { type: Number, default: 0 },
    carryForwardRight: { type: Number, default: 0 },

    lastProcessedYear:  { type: Number, default: null },
    lastProcessedMonth: { type: Number, default: null },

    updatedAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    }
}, { timestamps: true });

healthEducationBonusStateSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    next();
});

const HealthEducationBonusState = mongoose.model('HealthEducationBonusState', healthEducationBonusStateSchema);
export default HealthEducationBonusState;
