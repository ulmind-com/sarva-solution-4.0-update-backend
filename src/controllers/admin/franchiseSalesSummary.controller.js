import moment from 'moment-timezone';
import Invoice from '../../models/Invoice.model.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * ISOLATED endpoint — month-wise franchise sales summary.
 *
 * Intentionally self-contained (own controller + own route file) so it can't
 * affect the existing Sale History listing (`/admin/sales/list`). It only reads
 * the Invoice collection and never mutates anything.
 *
 * GET /api/v1/admin/franchise-sales-summary/monthly?month=YYYY-MM
 *   - `month` optional; defaults to the current calendar month (IST).
 *   - Returns the total sale value + invoice count for franchise invoices whose
 *     invoiceDate falls in that month (excluding cancelled / soft-deleted).
 */
const IST = 'Asia/Kolkata';

export const getMonthlyFranchiseSales = asyncHandler(async (req, res) => {
    const monthParam = String(req.query.month || '').trim();

    // Parse `YYYY-MM` in IST; fall back to the current IST month if missing/invalid.
    const base =
        monthParam && moment.tz(monthParam, 'YYYY-MM', true, IST).isValid()
            ? moment.tz(monthParam, 'YYYY-MM', true, IST)
            : moment.tz(IST);

    const start = base.clone().startOf('month').toDate();
    const end = base.clone().endOf('month').toDate();

    const [summary] = await Invoice.aggregate([
        {
            $match: {
                invoiceDate: { $gte: start, $lte: end },
                status: { $ne: 'cancelled' },
                deletedAt: null, // also matches docs where the field is absent
            },
        },
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$grandTotal' },
                invoiceCount: { $sum: 1 },
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                month: base.format('YYYY-MM'),
                monthLabel: base.format('MMMM YYYY'),
                startDate: start,
                endDate: end,
                totalAmount: summary?.totalAmount || 0,
                invoiceCount: summary?.invoiceCount || 0,
            },
            'Monthly franchise sales summary fetched'
        )
    );
});
