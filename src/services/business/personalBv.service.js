import moment from 'moment-timezone';
import User from '../../models/User.model.js';
import { ApiError } from '../../utils/ApiError.js';

const TIMEZONE = 'Asia/Kolkata';

/**
 * Calculates date boundaries for Current Month, Half-Year, and Annual periods.
 *
 * NOTE: This intentionally mirrors the boundary logic used by treeBv.service.js
 * so that a user's Personal BV lines up 1:1 with the Tree BV Summary shown next
 * to it. It is duplicated here (rather than imported) to keep this feature fully
 * isolated — nothing in the existing BV pipeline is touched.
 *
 * - Half-yearly periods: April 1 to Sept 30, Oct 1 to March 31.
 * - Annual period: April 1 to March 31.
 */
const getDateBoundaries = () => {
    const now = moment().tz(TIMEZONE);
    const currentMonth = now.month(); // 0-indexed: 0=Jan, 11=Dec

    // 1. Current Month
    const startOfCurrentMonth = now.clone().startOf('month');
    const endOfCurrentMonth = now.clone().endOf('month');

    // 2. Half-Yearly
    let startOfHalfYear, endOfHalfYear;
    if (currentMonth >= 3 && currentMonth <= 8) {
        // April 1 to September 30
        startOfHalfYear = now.clone().month(3).date(1).startOf('day');
        endOfHalfYear = now.clone().month(8).date(30).endOf('day');
    } else {
        // October 1 to March 31
        if (currentMonth < 3) {
            // Jan-Mar: Oct of PREVIOUS year to Mar of CURRENT year
            startOfHalfYear = now.clone().subtract(1, 'year').month(9).date(1).startOf('day');
            endOfHalfYear = now.clone().month(2).date(31).endOf('day');
        } else {
            // Oct-Dec: Oct of CURRENT year to Mar of NEXT year
            startOfHalfYear = now.clone().month(9).date(1).startOf('day');
            endOfHalfYear = now.clone().add(1, 'year').month(2).date(31).endOf('day');
        }
    }

    // 3. Annually
    let startOfAnnual, endOfAnnual;
    if (currentMonth >= 3) {
        // April-Dec: April of CURRENT year to Mar of NEXT year
        startOfAnnual = now.clone().month(3).date(1).startOf('day');
        endOfAnnual = now.clone().add(1, 'year').month(2).date(31).endOf('day');
    } else {
        // Jan-Mar: April of PREVIOUS year to Mar of CURRENT year
        startOfAnnual = now.clone().subtract(1, 'year').month(3).date(1).startOf('day');
        endOfAnnual = now.clone().month(2).date(31).endOf('day');
    }

    return {
        currentMonth: { start: startOfCurrentMonth.toDate(), end: endOfCurrentMonth.toDate() },
        halfYearly: { start: startOfHalfYear.toDate(), end: endOfHalfYear.toDate() },
        annually: { start: startOfAnnual.toDate(), end: endOfAnnual.toDate() },
        currentDate: now.toDate()
    };
};

/**
 * Service to calculate a single user's OWN (personal) purchased BV, sliced by
 * Current Month / Half-Yearly / Annual timeframes.
 *
 * Uses the exact same source of truth (SelfRepurchaseBVEntry) and bucketing rule
 * as the Tree BV Summary, but scoped to the user's own userId only — so it never
 * walks the downline and stays cheap even on large databases.
 */
export const personalBvService = {
    getPersonalBVSummary: async (userId) => {
        const user = await User.findById(userId).select('memberId username fullName').lean();
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        const dates = getDateBoundaries();

        const SelfRepurchaseBVEntry = (await import('../../models/SelfRepurchaseBVEntry.model.js')).default;
        // Only this user's own entries — no descendant traversal.
        const transactions = await SelfRepurchaseBVEntry.find({ userId }).lean();

        let currentMonth = 0;
        let halfYearly = 0;
        let annually = 0;

        const curStart = dates.currentMonth.start.getTime();
        const curEnd = dates.currentMonth.end.getTime();
        const halfStart = dates.halfYearly.start.getTime();
        const halfEnd = dates.halfYearly.end.getTime();
        const annStart = dates.annually.start.getTime();
        const annEnd = dates.annually.end.getTime();

        transactions.forEach(tx => {
            if (!tx.purchaseDate && !tx.createdAt) return;

            const txTime = new Date(tx.purchaseDate || tx.createdAt).getTime();
            const amt = tx.bvAmount || 0;

            if (txTime >= curStart && txTime <= curEnd) currentMonth += amt;
            if (txTime >= halfStart && txTime <= halfEnd) halfYearly += amt;
            if (txTime >= annStart && txTime <= annEnd) annually += amt;
        });

        return {
            user: {
                memberId: user.memberId,
                username: user.username,
                fullName: user.fullName
            },
            timeframes: {
                currentMonth: {
                    start: moment(dates.currentMonth.start).tz(TIMEZONE).format('YYYY-MM-DD'),
                    end: moment(dates.currentMonth.end).tz(TIMEZONE).format('YYYY-MM-DD')
                },
                halfYearly: {
                    start: moment(dates.halfYearly.start).tz(TIMEZONE).format('YYYY-MM-DD'),
                    end: moment(dates.halfYearly.end).tz(TIMEZONE).format('YYYY-MM-DD')
                },
                annually: {
                    start: moment(dates.annually.start).tz(TIMEZONE).format('YYYY-MM-DD'),
                    end: moment(dates.annually.end).tz(TIMEZONE).format('YYYY-MM-DD')
                }
            },
            personalBV: {
                currentMonth,
                halfYearly,
                annually
            }
        };
    }
};
