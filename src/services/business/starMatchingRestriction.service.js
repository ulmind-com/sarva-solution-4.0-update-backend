import Payout from '../../models/Payout.model.js';

/**
 * Star Matching Restriction Service (Isolated)
 * 
 * Business Rule: The 7th, 9th, 11th, 13th, and 15th Star Matching events
 * are restricted (no payout). All other events are normal.
 * 
 * This service queries existing Payout records to determine the count.
 * No new fields are added to any model.
 */
export const starMatchingRestrictionService = {

    /**
     * Check if the next star matching event is restricted.
     * @param {ObjectId} userId - The user's ObjectId
     * @returns {{ isRestricted: boolean, nextCount: number }}
     */
    check: async (userId) => {
        // Count ALL star matching events (bonus + flashout) for this user
        const totalCount = await Payout.countDocuments({
            userId: userId,
            payoutType: { $in: ['star-matching-bonus', 'star-matching-flashout'] }
        });

        // The NEXT event will be count + 1
        const nextCount = totalCount + 1;

        // Restricted: only positions 7, 9, 11, 13, 15
        const restrictedPositions = [7, 9, 11, 13, 15];
        const isRestricted = restrictedPositions.includes(nextCount);

        return { isRestricted, nextCount };
    }
};
