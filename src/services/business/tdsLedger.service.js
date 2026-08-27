import TdsLedger from '../../models/TdsLedger.model.js';
import moment from 'moment-timezone';

/**
 * TDS Ledger Service (ISOLATED)
 * -------------------------------------------------
 * On every user income where 2% TDS is deducted (at credit time), we also
 * append one audit record here with the user + amount + month details, so the
 * admin panel can report month-wise TDS collected per user.
 *
 * Fully separate from the main wallet / savings wallet / payout logic. This
 * only WRITES an audit row — it never moves money and never changes any
 * existing balance or deduction.
 *
 * The ONLY change required in each income service is a single extra call:
 *   tdsLedgerService.record({ userId, memberId, sourceType, grossAmount })
 */
export const TDS_PERCENT = 2; // 2%

/** Compute the TDS amount (2% of gross), rounded to 2 decimals. */
export const computeTds = (grossAmount) => {
    const g = Number(grossAmount) || 0;
    if (g <= 0) return 0;
    return parseFloat((g * (TDS_PERCENT / 100)).toFixed(2));
};

export const tdsLedgerService = {
    computeTds,

    /**
     * Append a TDS deduction record for a user. Returns the TDS amount recorded
     * (0 if nothing to record). Never throws in a way that breaks the caller —
     * income crediting must never fail because of this isolated audit log.
     */
    record: async ({ userId, memberId, sourceType, grossAmount, sourceRefId = null }) => {
        try {
            const tdsAmount = computeTds(grossAmount);
            if (tdsAmount <= 0) return 0;

            const nowIST = moment().tz('Asia/Kolkata');

            await TdsLedger.create({
                userId,
                memberId,
                sourceType,
                sourceRefId,
                grossAmount: parseFloat(Number(grossAmount).toFixed(2)),
                tdsPercent: TDS_PERCENT,
                tdsAmount,
                year: nowIST.year(),
                month: nowIST.month() + 1 // 1-12
            });

            return tdsAmount;
        } catch (err) {
            // Isolated audit log: log & swallow so it can never break income flow.
            console.error('[TdsLedger] Failed to record TDS:', err?.message);
            return 0;
        }
    }
};

export default tdsLedgerService;
