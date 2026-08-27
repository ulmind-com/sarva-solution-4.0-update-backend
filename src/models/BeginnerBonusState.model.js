import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * BeginnerBonusState
 * -------------------------------------------------
 * Stores the per-user carry-forward state that rolls between months.
 *
 * After every month-end calculation:
 *   - whichever leg (left/right) had MORE BV keeps the surplus (strongerBV - weakerBV).
 *   - the WEAKER leg resets to 0.
 *
 * This carry-forward is added to the *next* month's fresh BV before unit computation,
 * but it does NOT contribute to the company-wide companyBV for the new month.
 */
const beginnerBonusStateSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    memberId: { type: String, required: true, index: true },

    // BV rollover from the previous month's stronger leg
    carryForwardLeft:  { type: Number, default: 0 },
    carryForwardRight: { type: Number, default: 0 },

    // The year/month when this state was last computed
    lastProcessedYear:  { type: Number, default: null },
    lastProcessedMonth: { type: Number, default: null },

    // IST audit helpers
    updatedAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    }
}, { timestamps: true });

beginnerBonusStateSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    next();
});

const BeginnerBonusState = mongoose.model('BeginnerBonusState', beginnerBonusStateSchema);
export default BeginnerBonusState;
