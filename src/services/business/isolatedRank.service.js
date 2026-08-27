import UserFinance from '../../models/UserFinance.model.js';
import User from '../../models/User.model.js';
import Payout from '../../models/Payout.model.js';
import { getTreeLookup, getDescendantIds } from './_treeHelper.js';
import { savingsWalletService, SAVINGS_WALLET_PCT } from './savingsWallet.service.js';
import { tdsLedgerService } from './tdsLedger.service.js';

export const isolatedRankService = {
    /**
     * Check if user qualifies for the new isolated rank system based on exact left/right stars
     */
    checkIsolatedRankUpgrade: async (userId) => {
        try {
            const user = await User.findById(userId).select('memberId status leftChild rightChild').lean();
            if (!user || user.status !== 'active') return;

            const userFinance = await UserFinance.findOne({ user: user._id });
            if (!userFinance) return;

            // Define exact absolute thresholds ("Next Basis" accumulation)
            // Example: Silver = 30. Gold = 100 new, so absolute = 130.
            const isolatedRanks = [
                { name: 'Bronze', requiredStars: 10, bonus: 1000 },
                { name: 'Silver', requiredStars: 40, bonus: 2500 },
                { name: 'Gold', requiredStars: 140, bonus: 6000 },
                { name: 'Platinum', requiredStars: 340, bonus: 10000 },
                { name: 'Diamond', requiredStars: 840, bonus: 20000 },
                { name: 'Ruby', requiredStars: 1840, bonus: 30000 },
                { name: 'Sapphire', requiredStars: 3840, bonus: 60000 },
                { name: 'Emerald', requiredStars: 8840, bonus: 130000 },
                { name: 'Crown', requiredStars: 20840, bonus: 300000 },
                { name: 'Elite', requiredStars: 45840, bonus: 600000 },
                { name: 'Royal', requiredStars: 95840, bonus: 1250000 },
                { name: 'Legend', requiredStars: 195840, bonus: 2550000 },
                { name: 'SSVPL Legend', requiredStars: 395840, bonus: 5050000 },
                { name: 'SSVPL Master', requiredStars: 795840, bonus: 10000000 }
            ];

            // 1. Fetch exact star counts using tree helper (same as getStarCount API)
            const lookup = await getTreeLookup(User);
            
            const leftIds = getDescendantIds(lookup, user.leftChild);
            const rightIds = getDescendantIds(lookup, user.rightChild);

            const [leftStarCount, rightStarCount] = await Promise.all([
                leftIds.length > 0 ? UserFinance.countDocuments({ user: { $in: leftIds }, isStar: true }) : 0,
                rightIds.length > 0 ? UserFinance.countDocuments({ user: { $in: rightIds }, isStar: true }) : 0
            ]);

            // console.log(`[IsolatedRank] User ${user.memberId} - Left Stars: ${leftStarCount}, Right Stars: ${rightStarCount}`);

            let newRank = userFinance.isolatedRank || 'Associate';
            let rankBonus = 0;

            // 2. Determine highest eligible rank
            for (const r of isolatedRanks) {
                // Must have the required stars on BOTH legs
                if (leftStarCount >= r.requiredStars && rightStarCount >= r.requiredStars) {
                    
                    const currentIndex = isolatedRanks.findIndex(rk => rk.name === userFinance.isolatedRank);
                    const candidateIndex = isolatedRanks.findIndex(rk => rk.name === r.name);

                    // Treat 'Associate' as index -1
                    const effectiveCurrentIndex = userFinance.isolatedRank === 'Associate' ? -1 : currentIndex;

                    // Only upgrade if the candidate rank is higher than the current isolated rank
                    if (candidateIndex > effectiveCurrentIndex) {
                        newRank = r.name;
                        rankBonus = r.bonus;
                    }
                }
            }

            // 3. Process Upgrade and Payout
            if (newRank !== userFinance.isolatedRank && newRank !== 'Associate') {
                console.log(`[IsolatedRank] User ${user.memberId} upgrading to ${newRank} with bonus ₹${rankBonus}`);
                
                userFinance.isolatedRank = newRank;
                userFinance.isolatedRankHistory.push({ rank: newRank, date: new Date() });

                if (rankBonus > 0) {
                    // Deductions: 10% Admin, 2% TDS, + 8% Savings Wallet (isolated)
                    const adminCharge = rankBonus * 0.10;
                    const tdsAmount = rankBonus * 0.02;
                    const savingsShare = parseFloat((rankBonus * SAVINGS_WALLET_PCT).toFixed(2)); // ISOLATED: 8% of gross to Savings Wallet
                    const netAmount = parseFloat((rankBonus - adminCharge - tdsAmount - savingsShare).toFixed(2));

                    await Payout.create({
                        userId: user._id,
                        memberId: user.memberId,
                        payoutType: 'isolated-rank-bonus',
                        grossAmount: rankBonus,
                        adminCharge: adminCharge,
                        tdsDeducted: tdsAmount,
                        savingsDeduction: savingsShare,
                        netAmount: netAmount,
                        status: 'completed',
                        metadata: {
                            leftStars: leftStarCount,
                            rightStars: rightStarCount,
                            isolatedRank: newRank
                        }
                    });

                    userFinance.wallet.availableBalance += netAmount;
                    userFinance.wallet.totalEarnings += netAmount;

                    // ISOLATED: deposit the diverted 8% into the Savings Wallet
                    await savingsWalletService.credit({
                        userId: user._id,
                        memberId: user.memberId,
                        sourceType: 'isolated-rank-bonus',
                        grossAmount: rankBonus
                    });

                    // ISOLATED: record the 2% TDS deducted from this income (admin reporting only)
                    await tdsLedgerService.record({
                        userId: user._id,
                        memberId: user.memberId,
                        sourceType: 'isolated-rank-bonus',
                        grossAmount: rankBonus
                    });
                }

                await userFinance.save();
            }

        } catch (error) {
            console.error(`[IsolatedRank] Error checking rank for user ${userId}:`, error.message);
        }
    }
};
