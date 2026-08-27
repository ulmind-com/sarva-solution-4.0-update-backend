import moment from 'moment-timezone';
import { getTreeLookup, getDescendantIds } from './_treeHelper.js';

// --- TIMEZONE & DATE LOGIC ---
const TIMEZONE = 'Asia/Kolkata';

const _getMonthlyQuery = (year, month) => ({ year, month });

const _getHalfYearlyQuery = (cycleYear, cycleNumber) => {
    if (cycleNumber === 1) {
        return { year: cycleYear, month: { $in: [4, 5, 6, 7, 8, 9] } };
    } else {
        return {
            $or: [
                { year: cycleYear, month: { $in: [10, 11, 12] } },
                { year: cycleYear + 1, month: { $in: [1, 2, 3] } }
            ]
        };
    }
};

const _getYearlyQuery = (cycleYear) => {
    return {
        $or: [
            { year: cycleYear - 1, month: { $in: [4, 5, 6, 7, 8, 9, 10, 11, 12] } },
            { year: cycleYear, month: { $in: [1, 2, 3] } }
        ]
    };
};

const _calculateBvForPeriod = async (userId, query, _prebuiltLookup = null) => {
    const User = (await import('../../models/User.model.js')).default;
    const SelfRepurchaseBVEntry = (await import('../../models/SelfRepurchaseBVEntry.model.js')).default;

    const lookup = _prebuiltLookup || await getTreeLookup(User);
    const userNode = lookup.get(userId.toString());
    
    if (!userNode) return { leftBV: 0, rightBV: 0, personalBV: 0 };

    const leftDesc = getDescendantIds(lookup, userNode.leftChild);
    const rightDesc = getDescendantIds(lookup, userNode.rightChild);

    const [leftEntries, rightEntries, personalEntries] = await Promise.all([
        leftDesc.length > 0 ? SelfRepurchaseBVEntry.find({ userId: { $in: leftDesc }, ...query }).lean() : [],
        rightDesc.length > 0 ? SelfRepurchaseBVEntry.find({ userId: { $in: rightDesc }, ...query }).lean() : [],
        SelfRepurchaseBVEntry.find({ userId, ...query }).lean()
    ]);

    const leftBV = leftEntries.reduce((acc, e) => acc + (e.bvAmount || 0), 0);
    const rightBV = rightEntries.reduce((acc, e) => acc + (e.bvAmount || 0), 0);
    const personalBV = personalEntries.reduce((acc, e) => acc + (e.bvAmount || 0), 0);

    return { leftBV, rightBV, personalBV };
};

export const historicalBvService = {
    
    // Core isolated calculation engines
    getMonthlyHistory: (userId, year, month, lookup = null) => _calculateBvForPeriod(userId, _getMonthlyQuery(year, month), lookup),
    getHalfYearlyHistory: (userId, cycleYear, cycleNumber, lookup = null) => _calculateBvForPeriod(userId, _getHalfYearlyQuery(cycleYear, cycleNumber), lookup),
    getYearlyHistory: (userId, cycleYear, lookup = null) => _calculateBvForPeriod(userId, _getYearlyQuery(cycleYear), lookup),

    // Batch Processors (for frontend history tables)
    getRecentMonths: async (userId, monthsCount = 6) => {
        const User = (await import('../../models/User.model.js')).default;
        const lookup = await getTreeLookup(User);
        const results = [];
        
        // Start from current month
        let current = moment().tz(TIMEZONE);
        
        for (let i = 0; i < monthsCount; i++) {
            const y = current.year();
            const m = current.month() + 1;
            
            const stats = await _calculateBvForPeriod(userId, _getMonthlyQuery(y, m), lookup);
            
            results.push({
                period: `${current.format('MMMM')} ${y}`,
                year: y,
                month: m,
                ...stats,
                totalMatch: Math.min(stats.leftBV, stats.rightBV)
            });
            
            // Move back 1 month
            current.subtract(1, 'months');
        }
        return results;
    },

    getRecentHalfYears: async (userId, cyclesCount = 4) => {
        const User = (await import('../../models/User.model.js')).default;
        const lookup = await getTreeLookup(User);
        const results = [];
        
        const now = moment().tz(TIMEZONE);
        let y = now.year();
        let m = now.month() + 1;
        
        let currentCycleNumber = (m >= 4 && m <= 9) ? 1 : 2;
        let currentCycleYear = (m >= 1 && m <= 3) ? (y - 1) : y;

        for (let i = 0; i < cyclesCount; i++) {
            const stats = await _calculateBvForPeriod(userId, _getHalfYearlyQuery(currentCycleYear, currentCycleNumber), lookup);
            
            results.push({
                period: currentCycleNumber === 1 ? `Apr-Sep ${currentCycleYear}` : `Oct ${currentCycleYear} - Mar ${currentCycleYear + 1}`,
                cycleYear: currentCycleYear,
                cycleNumber: currentCycleNumber,
                ...stats,
                totalMatch: Math.min(stats.leftBV, stats.rightBV)
            });
            
            // Go back 1 cycle
            if (currentCycleNumber === 2) {
                currentCycleNumber = 1;
            } else {
                currentCycleNumber = 2;
                currentCycleYear -= 1;
            }
        }
        return results;
    },

    getRecentYears: async (userId, yearsCount = 3) => {
        const User = (await import('../../models/User.model.js')).default;
        const lookup = await getTreeLookup(User);
        const results = [];
        
        const now = moment().tz(TIMEZONE);
        let y = now.year();
        let m = now.month() + 1;
        
        // Active cycle ends in March of next year if we are in Apr-Dec
        let currentCycleYear = (m >= 4 && m <= 12) ? y + 1 : y;

        for (let i = 0; i < yearsCount; i++) {
            const stats = await _calculateBvForPeriod(userId, _getYearlyQuery(currentCycleYear), lookup);
            
            results.push({
                period: `Apr ${currentCycleYear - 1} - Mar ${currentCycleYear}`,
                cycleYear: currentCycleYear,
                ...stats,
                totalMatch: Math.min(stats.leftBV, stats.rightBV)
            });
            
            // Go back 1 year
            currentCycleYear -= 1;
        }
        return results;
    }
};
