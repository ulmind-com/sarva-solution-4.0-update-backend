import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * BikeCarFundState
 * -------------------------------------------------
 * Per-user carry-forward state for Bike & Car Fund.
 * After month-end: stronger leg keeps (stronger - weaker) surplus; weaker leg resets to 0.
 *
 * Rules: 1,00,000 BV = 1 Unit | No capping | 5% of company BV pooled
 */
const bikeCarFundStateSchema = new mongoose.Schema({
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

bikeCarFundStateSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    next();
});

const BikeCarFundState = mongoose.model('BikeCarFundState', bikeCarFundStateSchema);
export default BikeCarFundState;
