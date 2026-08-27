import User from '../../models/User.model.js';
import Payout from '../../models/Payout.model.js';
import BVTransaction from '../../models/BVTransaction.model.js';

/**
 * Service to handle Repurchase Bonuses and Stock Point incentives.
 */
export const bonusService = {
    /**
     * Calculate Self Repurchase Bonus (7% on own BV)
     * Rule: Must purchase by 10th of every month (handled in cron/controller)
     */
    calculateSelfRepurchaseBonus: async (userId, selfBV) => {
        const user = await User.findById(userId);
        if (!user) return;

        // Rule: Need 2 direct sponsors for most bonuses
        if (user.directSponsors.count < 2) return;
        const adminCharge = bonus * 0.10;
        const netAmount = bonus - adminCharge;

        await Payout.create({
            userId,
            memberId: user.memberId,
            payoutType: 'repurchase-self',
            grossAmount: bonus,
            adminCharge,
            netAmount,
            status: 'pending'
        });

        user.selfPurchase.bonusEarned += bonus;
        user.wallet.availableBalance += netAmount;
        await user.save();
    },

    /**
     * Calculate Stock Point Bonuses
     * LSP: 10% on achieving 1 Lakh BV
     * MSP: 15% on achieving 5 Lakh BV
     */
    checkStockPointEligibility: async (userId) => {
        const user = await User.findById(userId);
        if (!user) return;

        // LSP Check
        if (!user.lsp.achieved && user.lsp.currentBV >= user.lsp.targetBV) {
            user.lsp.achieved = true;
            user.lsp.achievedDate = new Date();
            // Bonus logic could be a fixed amount or percentage of total volume
            // Assuming 10% of targetBV for now
            const bonus = user.lsp.targetBV * 0.10;
            await bonusService.createBonusPayout(user, 'lsp-bonus', bonus);
        }

        // MSP Check
        if (!user.msp.achieved && user.msp.currentBV >= user.msp.targetBV) {
            user.msp.achieved = true;
            user.msp.achievedDate = new Date();
            const bonus = user.msp.targetBV * 0.15;
            await bonusService.createBonusPayout(user, 'msp-bonus', bonus);
        }

        await user.save();
    },

    /**
     * Helper to create a payout for bonuses
     */
    createBonusPayout: async (user, type, amount) => {
        const adminCharge = amount * 0.05;
        const netAmount = amount - adminCharge;

        await Payout.create({
            userId: user._id,
            memberId: user.memberId,
            payoutType: type,
            grossAmount: amount,
            adminCharge,
            netAmount,
            status: 'pending'
        });

        user.wallet.availableBalance += netAmount;
        user.wallet.totalEarnings += netAmount;
    }
};
