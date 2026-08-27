import UserFinance from '../../models/UserFinance.model.js';
import User from '../../models/User.model.js';
import Payout from '../../models/Payout.model.js';
import { matchingService } from './matching.service.js';
import { savingsWalletService, SAVINGS_WALLET_PCT } from './savingsWallet.service.js';
import { tdsLedgerService } from './tdsLedger.service.js';

export const rankService = {
    /**
     * Check if user qualifies for rank upgrade based on Stars
     */
    /**
     * Check if user qualifies for rank upgrade based on Stars (Next Basis)
     */
    checkRankUpgrade: async (userId) => {
        const finance = await UserFinance.findOne({ user: userId });
        if (!finance) return;

        // "Next Basis" Logic:
        // Requirement is based on CURRENT count.
        // Once achieved, count resets to 0.

        // Mapping Ranks and Required *Matches* (not stars, since 1 match = 1 star pair)
        const rankRequirements = {
            'Associate': 0,
            'Star': 0, // Achieved via Fast Track, not matches
            'Bronze': 10,
            'Silver': 30,
            'Gold': 100,
            'Platinum': 200,
            'Diamond': 500,
            'Ruby': 1000,
            'Sapphire': 2000,
            'Emerald': 5000,
            'Crown': 12000, // Spec says Crown, existing was Blue Sapphire etc. Updating to Spec.
            // Spec: "Emerald -> Crown -> Elite -> Royal -> Legend -> SSVPL Legend"
            // Re-aligning with Spec provided in prompt.
            'Elite': 25000,
            'Royal': 50000,
            'Legend': 100000,
            'SSVPL Legend': 200000
        };

        const rankBonuses = {
            'Bronze': 1000,
            'Silver': 2500,
            'Gold': 6000,
            'Platinum': 10000,
            'Diamond': 20000,
            'Ruby': 30000,
            'Sapphire': 60000,
            'Emerald': 130000,
            'Crown': 300000,
            'Elite': 600000,
            'Royal': 1250000,
            'Legend': 2550000,
            'SSVPL Legend': 5050000
        };

        const rankOrder = [
            'Associate', 'Star', 'Bronze', 'Silver', 'Gold', 'Platinum',
            'Diamond', 'Ruby', 'Sapphire', 'Emerald', 'Crown',
            'Elite', 'Royal', 'Legend', 'SSVPL Legend'
        ];

        let currentRank = finance.currentRank;
        let currentCount = finance.currentRankMatchCount;

        // Determine Next Rank
        const currentIndex = rankOrder.indexOf(currentRank);
        if (currentIndex === -1 || currentIndex >= rankOrder.length - 1) return; // Max rank

        const nextRank = rankOrder[currentIndex + 1];
        const requiredMatches = rankRequirements[nextRank];

        if (!requiredMatches) return; // Should not happen for valid next rank

        // Check if Qualified
        if (currentCount >= requiredMatches) {
            console.log(`User ${finance.memberId} upgrading to ${nextRank}`);

            // 1. Process Upgrade
            const oldRank = finance.currentRank;
            finance.currentRank = nextRank;
            finance.rankNumber = currentIndex + 2; // 1-based index
            finance.achievedDate = new Date();
            finance.rankHistory.push({ rank: nextRank, date: new Date() });

            // 2. Reset Counter ("Next Basis")
            finance.currentRankMatchCount = 0;
            // Optional: Carry forward excess? Spec doesn't specify, but usually "Resets" means 0.
            // "The counter effectively 'resets' or looks for fresh business".
            // Implementation: Set to 0.

            // 3. Process Bonus
            const bonus = rankBonuses[nextRank] || 0;
            if (bonus > 0) {
                const adminCharge = bonus * 0.10;
                const tdsAmount = bonus * 0.02;
                const savingsShare = parseFloat((bonus * SAVINGS_WALLET_PCT).toFixed(2)); // ISOLATED: 8% of gross to Savings Wallet
                const netAmount = parseFloat((bonus - adminCharge - tdsAmount - savingsShare).toFixed(2));

                await Payout.create({
                    userId: userId,
                    memberId: finance.memberId,
                    payoutType: 'rank-bonus',
                    grossAmount: bonus,
                    adminCharge,
                    tdsDeducted: tdsAmount,
                    savingsDeduction: savingsShare,
                    netAmount,
                    status: 'completed',
                    metadata: { rank: nextRank }
                });

                finance.wallet.availableBalance += netAmount;
                finance.wallet.totalEarnings += netAmount;
                finance.rankBonus += bonus; // Total rank bonus tracking

                // ISOLATED: deposit the diverted 8% into the Savings Wallet
                await savingsWalletService.credit({
                    userId,
                    memberId: finance.memberId,
                    sourceType: 'rank-bonus',
                    grossAmount: bonus
                });

                // ISOLATED: record the 2% TDS deducted from this income (admin reporting only)
                await tdsLedgerService.record({
                    userId,
                    memberId: finance.memberId,
                    sourceType: 'rank-bonus',
                    grossAmount: bonus
                });
            }

            await finance.save();
        }
    },

    /**
     * Propagate Stars to Upline
     * Triggered when a user becomes a STAR (12th deduction).
     * Adds +1 Star to the Immediate Upline's Left or Right STAR buffer.
     */
    addStarsToUpline: async (userId) => {
        // Find user to know their placement
        const user = await User.findById(userId);
        if (!user || user.position === 'root') return;

        // Traverse up to find upline to credit
        // Logic: Who gets the "One Star"?
        // "This logic looks for 'Star Users' in the downline".
        // It should propagate up the tree.
        // Immediate Sponsor? Or Placement Parent?
        // Binary matching usually works on Placement Tree (ParentId).

        let current = user;
        let parentId = user.parentId;
        let position = user.position;

        while (parentId) {
            const parent = await User.findOne({ memberId: parentId });
            if (!parent) break;

            // Only crediting "Active" parents? Or All?
            // Usually valid placement parents.

            const parentFinance = await UserFinance.findOne({ user: parent._id });
            if (parentFinance) {
                // Does Parent need to be a Star to receive points?
                // "Now, they earn this additional bonus".
                // Implies only Stars earn Star Matching.
                // BUT, do they *accumulate* points before becoming Star?
                // Spec: "Once a user ... become a 'STAR'. Now, they earn...".
                // Usually points accumulate, but matching only happens if qualified.
                // Let's accumulate for everyone, but `processStarMatching` checks `isStar`.

                if (position === 'left') {
                    parentFinance.starMatchingBonus.pendingStarsLeft += 1;
                } else {
                    parentFinance.starMatchingBonus.pendingStarsRight += 1;
                }
                await parentFinance.save();

                // Trigger processing for parent?
                // Yes, real-time trigger or wait for cron.
                // Let's trigger verification.
                // No await to avoid blocking? Or await for safety?
                // await matchingService.processStarMatching(parent._id);
                // Better to let Cron handle it or minimal trigger.
                // Given the loop, recursive triggers might be heavy. 
                // But let's trigger it.
                matchingService.processStarMatching(parent._id).catch(e => console.error(e));
            }

            // Move Up
            position = parent.position;
            parentId = parent.parentId;
        }
    }
};
