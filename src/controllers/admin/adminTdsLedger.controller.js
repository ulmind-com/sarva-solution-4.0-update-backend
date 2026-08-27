import User from '../../models/User.model.js';
import TdsLedger from '../../models/TdsLedger.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * ISOLATED — Admin TDS reporting (read-only).
 * -------------------------------------------------
 * Reports the 2% TDS collected from every user income, aggregated month-wise.
 * These endpoints ONLY read the TdsLedger audit collection. They do not touch
 * wallets, payouts or any existing logic.
 */

/**
 * @desc    Month-wise TDS collected, per user. One row per (user, year, month).
 *          Optional filters: ?year=2026&month=7 (both optional). Defaults to
 *          all months. Sorted newest month first, highest TDS first.
 * @route   GET /api/v1/admin/tds/monthly
 * @access  Private/Admin
 */
export const getMonthlyTdsPerUser = asyncHandler(async (req, res) => {
    const { year, month } = req.query;

    const match = {};
    if (year)  match.year  = Number(year);
    if (month) match.month = Number(month);

    const rows = await TdsLedger.aggregate([
        { $match: match },
        {
            $group: {
                _id: { userId: '$userId', memberId: '$memberId', year: '$year', month: '$month' },
                totalTds:    { $sum: '$tdsAmount' },
                totalGross:  { $sum: '$grossAmount' },
                entryCount:  { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                userId:     '$_id.userId',
                memberId:   '$_id.memberId',
                year:       '$_id.year',
                month:      '$_id.month',
                totalTds:   { $round: ['$totalTds', 2] },
                totalGross: { $round: ['$totalGross', 2] },
                entryCount: 1
            }
        },
        { $sort: { year: -1, month: -1, totalTds: -1 } }
    ]);

    // Attach user's full name for admin readability
    const userIds = [...new Set(rows.map(r => String(r.userId)))];
    const users = await User.find({ _id: { $in: userIds } }).select('_id fullName memberId').lean();
    const nameMap = new Map(users.map(u => [String(u._id), u.fullName]));

    const data = rows.map(r => ({ ...r, fullName: nameMap.get(String(r.userId)) || null }));
    const grandTotalTds = data.reduce((s, r) => s + r.totalTds, 0);

    return res.status(200).json(
        new ApiResponse(200, {
            filter: { year: year ? Number(year) : null, month: month ? Number(month) : null },
            rowCount: data.length,
            grandTotalTds: parseFloat(grandTotalTds.toFixed(2)),
            rows: data
        }, 'Month-wise TDS per user fetched')
    );
});

/**
 * @desc    Full TDS detail for one user — month-wise summary + per income-type
 *          breakdown + raw entries. Lookup by memberId.
 * @route   GET /api/v1/admin/tds/user/:memberId
 * @access  Private/Admin
 */
export const getUserTdsDetails = asyncHandler(async (req, res) => {
    const { memberId } = req.params;

    const user = await User.findOne({ memberId }).select('_id memberId fullName status').lean();
    if (!user) throw new ApiError(404, 'User not found');

    const [monthly, bySource, entries] = await Promise.all([
        // Month-wise totals
        TdsLedger.aggregate([
            { $match: { userId: user._id } },
            {
                $group: {
                    _id: { year: '$year', month: '$month' },
                    totalTds:   { $sum: '$tdsAmount' },
                    totalGross: { $sum: '$grossAmount' },
                    entryCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    totalTds:   { $round: ['$totalTds', 2] },
                    totalGross: { $round: ['$totalGross', 2] },
                    entryCount: 1
                }
            },
            { $sort: { year: -1, month: -1 } }
        ]),
        // Breakdown by income type
        TdsLedger.aggregate([
            { $match: { userId: user._id } },
            {
                $group: {
                    _id: '$sourceType',
                    totalTds:   { $sum: '$tdsAmount' },
                    totalGross: { $sum: '$grossAmount' },
                    entryCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    sourceType: '$_id',
                    totalTds:   { $round: ['$totalTds', 2] },
                    totalGross: { $round: ['$totalGross', 2] },
                    entryCount: 1
                }
            },
            { $sort: { totalTds: -1 } }
        ]),
        // Raw entries (most recent first)
        TdsLedger.find({ userId: user._id }).sort({ createdAt: -1 }).lean()
    ]);

    const totalTds = monthly.reduce((s, m) => s + m.totalTds, 0);

    return res.status(200).json(
        new ApiResponse(200, {
            user,
            totalTds: parseFloat(totalTds.toFixed(2)),
            monthly,
            bySource,
            entries
        }, 'User TDS details fetched')
    );
});

/**
 * @desc    Company-wide TDS summary, grouped month-wise (all users combined).
 *          Useful for the "how much TDS to remit this month" view.
 * @route   GET /api/v1/admin/tds/summary
 * @access  Private/Admin
 */
export const getTdsSummary = asyncHandler(async (req, res) => {
    const monthly = await TdsLedger.aggregate([
        {
            $group: {
                _id: { year: '$year', month: '$month' },
                totalTds:    { $sum: '$tdsAmount' },
                totalGross:  { $sum: '$grossAmount' },
                userCount:   { $addToSet: '$userId' },
                entryCount:  { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                year: '$_id.year',
                month: '$_id.month',
                totalTds:   { $round: ['$totalTds', 2] },
                totalGross: { $round: ['$totalGross', 2] },
                userCount:  { $size: '$userCount' },
                entryCount: 1
            }
        },
        { $sort: { year: -1, month: -1 } }
    ]);

    const grandTotalTds = monthly.reduce((s, m) => s + m.totalTds, 0);

    return res.status(200).json(
        new ApiResponse(200, {
            grandTotalTds: parseFloat(grandTotalTds.toFixed(2)),
            monthly
        }, 'Company TDS summary fetched')
    );
});
