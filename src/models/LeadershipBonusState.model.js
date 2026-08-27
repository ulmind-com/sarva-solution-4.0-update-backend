import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * LeadershipBonusState
 * -------------------------------------------------
 * Per-user carry-forward state for Leadership Bonus.
 * After month-end: stronger leg keeps (stronger - weaker) surplus; weaker leg resets to 0.
 * This carry-forward adds to next month's fresh BV but does NOT count in company pool BV.
 *
 * Rules: 12,000 BV = 1 Unit | No capping | 12% of company BV pooled
 */
const leadershipBonusStateSchema = new mongoose.Schema({
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

leadershipBonusStateSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    next();
});

const LeadershipBonusState = mongoose.model('LeadershipBonusState', leadershipBonusStateSchema);
export default LeadershipBonusState;
