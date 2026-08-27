import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * TdsLedger
 * -------------------------------------------------
 * ISOLATED audit log for every 2% TDS deducted from a user's income.
 * One document per income event that had TDS deducted (at credit time).
 *
 * This is a deposit-only / append-only record — it does NOT touch the main
 * wallet, savings wallet, payout or any existing deduction logic. Its ONLY
 * purpose is so the admin panel can see, per user and per month, how much TDS
 * has been collected (to later remit to the government).
 *
 * The ONLY change required in each income service is a single extra call:
 *   tdsLedgerService.record({ userId, memberId, sourceType, grossAmount })
 * placed right beside the existing savingsWalletService.credit(...) call.
 */
const tdsLedgerSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    memberId: { type: String, required: true, index: true },

    sourceType:  { type: String, required: true },                        // income/payoutType that triggered it
    sourceRefId: { type: mongoose.Schema.Types.ObjectId, default: null }, // optional Payout / WalletCredit id

    grossAmount: { type: Number, required: true },                        // gross income the TDS was computed on
    tdsPercent:  { type: Number, default: 2 },                            // 2%
    tdsAmount:   { type: Number, required: true },                        // rupees deducted as TDS

    // IST year/month for easy month-wise admin grouping & filtering
    year:  { type: Number, required: true, index: true },
    month: { type: Number, required: true, index: true },                 // 1-12

    createdAt_IST: {
        type: String,
        default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    }
}, { timestamps: true });

tdsLedgerSchema.index({ userId: 1, year: 1, month: 1 });
tdsLedgerSchema.index({ year: 1, month: 1 });
tdsLedgerSchema.index({ userId: 1, createdAt: -1 });

const TdsLedger = mongoose.model('TdsLedger', tdsLedgerSchema);
export default TdsLedger;
