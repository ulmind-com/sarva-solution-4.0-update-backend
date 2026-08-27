import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import User from '../../models/User.model.js';
import UserFinance from '../../models/UserFinance.model.js';
import Payout from '../../models/Payout.model.js';

/**
 * Admin-only endpoint to fix data inconsistencies
 * POST /api/v1/admin/fix-database
 */
export const fixDatabaseIssues = asyncHandler(async (req, res) => {
    const ADMIN_CHARGE_PERCENT = 0.05;
    const TDS_PERCENT = 0.02;

    const results = {
        payoutsFixed: 0,
        ranksFixed: 0,
        financeRecordsFixed: 0,
        errors: []
    };

    try {
        // FIX 1: Update TDS in all payout records
        const allPayouts = await Payout.find({});

        for (const payout of allPayouts) {
            // Skip deducted, failed, or withdrawal records
            if (payout.status === 'deducted' || payout.status === 'failed' || payout.payoutType === 'withdrawal') {
                continue;
            }

            // Calculate correct values
            const correctAdminCharge = Math.round(payout.grossAmount * ADMIN_CHARGE_PERCENT * 100) / 100;
            const correctTDS = Math.round(payout.grossAmount * TDS_PERCENT * 100) / 100;
            const correctNetAmount = Math.round((payout.grossAmount - correctAdminCharge - correctTDS) * 100) / 100;

            // Check if needs fix
            const needsFix =
                payout.tdsDeducted !== correctTDS ||
                payout.adminCharge !== correctAdminCharge ||
                payout.netAmount !== correctNetAmount;

            if (needsFix) {
                const oldTDS = payout.tdsDeducted;
                const oldNet = payout.netAmount;

                payout.adminCharge = correctAdminCharge;
                payout.tdsDeducted = correctTDS;
                payout.netAmount = correctNetAmount;
                await payout.save();

                results.payoutsFixed++;
                console.log(`Fixed payout ${payout._id}: TDS ${oldTDS} → ${correctTDS}, Net ${oldNet} → ${correctNetAmount}`);
            }
        }

        // FIX 2: Validate and fix rank inconsistencies
        const RANK_REQUIREMENTS = {
            'Associate': 0,
            'Star': 1,
            'Bronze': 25,
            'Silver': 50,
            'Gold': 100,
            'Platinum': 200,
            'Diamond': 400,
            'Blue Diamond': 800,
            'Black Diamond': 1600,
            'Royal Diamond': 3200,
            'Crown Diamond': 6400,
            'Ambassador': 12800,
            'Crown Ambassador': 25600,
            'SSVPL Legend': 200000
        };

        const allUsers = await User.find({});

        for (const user of allUsers) {
            const finance = await UserFinance.findOne({ user: user._id });
            if (!finance) continue;

            const currentStars = finance.starMatching || 0;
            const currentRank = user.currentRank;
            const requiredStars = RANK_REQUIREMENTS[currentRank];

            // If current rank requires more stars than user has, downgrade
            if (currentStars < requiredStars) {
                // Find the correct rank
                let correctRank = 'Associate';
                for (const [rank, requirement] of Object.entries(RANK_REQUIREMENTS)) {
                    if (currentStars >= requirement) {
                        correctRank = rank;
                    } else {
                        break;
                    }
                }

                if (correctRank !== currentRank) {
                    console.log(`Fixing rank for ${user.memberId}: ${currentRank} → ${correctRank} (has ${currentStars} stars, needs ${requiredStars})`);
                    user.currentRank = correctRank;
                    await user.save();
                    results.ranksFixed++;
                }
            }
        }

        // FIX 3: Ensure all users have finance records
        for (const user of allUsers) {
            let finance = await UserFinance.findOne({ user: user._id });

            if (!finance) {
                finance = await UserFinance.create({
                    user: user._id,
                    personalBV: 0,
                    leftLegBV: 0,
                    rightLegBV: 0,
                    totalBV: 0,
                    starMatching: 0,
                    wallet: {
                        totalEarnings: 0,
                        availableBalance: 0,
                        withdrawnAmount: 0,
                        pendingWithdrawal: 0
                    },
                    fastTrack: {
                        totalClosings: 0,
                        dailyClosings: 0,
                        lastClosingTime: null,
                        pendingPairLeft: 0,
                        pendingPairRight: 0,
                        carryForwardLeft: 0,
                        carryForwardRight: 0,
                        weeklyEarnings: 0,
                        closingHistory: []
                    },
                    starMatchingBonus: {
                        totalClosings: 0,
                        dailyClosings: 0,
                        lastClosingTime: null,
                        pendingStarsLeft: 0,
                        pendingStarsRight: 0,
                        carryForwardStarsLeft: 0,
                        carryForwardStarsRight: 0,
                        weeklyEarnings: 0,
                        closingHistory: []
                    }
                });
                results.financeRecordsFixed++;
            }
        }

        // FIX 4: Synchronize UserFinance BV aggregates securely derived from the BVTransaction ledger exactly as mathematically proven
        // to resolve desynchronization bugs affecting repurchases reporting as 0,0 locally.
        const BVTransaction = (await import('../../models/BVTransaction.model.js')).default;
        
        for (const user of allUsers) {
            const finance = await UserFinance.findOne({ user: user._id });
            if (!finance) continue;

            // Fetch accurate historical transactions representing the true baseline sum.
            const userTrans = await BVTransaction.find({ userId: user._id }).lean();
            
            let calcLeftLegBV = 0;
            let calcRightLegBV = 0;
            let calcLeftLegPV = 0;
            let calcRightLegPV = 0;

            userTrans.forEach(tx => {
                const bAmt = tx.bvAmount || 0;
                const pAmt = tx.pvAmount || 0;

                if (tx.legAffected === 'left') {
                    calcLeftLegBV += bAmt;
                    calcLeftLegPV += pAmt;
                } else if (tx.legAffected === 'right') {
                    calcRightLegBV += bAmt;
                    calcRightLegPV += pAmt;
                }
            });

            const totalCalcBV = calcLeftLegBV + calcRightLegBV;
            const totalCalcPV = calcLeftLegPV + calcRightLegPV;

            const needsBVSync = 
                finance.leftLegBV !== calcLeftLegBV || 
                finance.rightLegBV !== calcRightLegBV || 
                finance.leftLegPV !== calcLeftLegPV || 
                finance.rightLegPV !== calcRightLegPV ||
                finance.totalBV !== totalCalcBV ||
                finance.totalPV !== totalCalcPV;

            if (needsBVSync) {
                finance.leftLegBV = calcLeftLegBV;
                finance.rightLegBV = calcRightLegBV;
                finance.leftLegPV = calcLeftLegPV;
                finance.rightLegPV = calcRightLegPV;
                finance.totalBV = totalCalcBV;
                finance.totalPV = totalCalcPV;
                
                // Keep the User model in literal sync strictly since legacy apps use it optionally
                user.leftLegBV = calcLeftLegBV;
                user.rightLegBV = calcRightLegBV;
                user.leftLegPV = calcLeftLegPV;
                user.rightLegPV = calcRightLegPV;
                user.totalBV = totalCalcBV;
                user.totalPV = totalCalcPV;

                await finance.save();
                await user.save();
                
                results.financeRecordsFixed++;
                console.log(`Synced BV data successfully securely based on transactions for Member ${user.memberId}`);
            }
        }

        return res.status(200).json(
            new ApiResponse(200, results, 'Database issues fixed successfully')
        );

    } catch (error) {
        results.errors.push(error.message);
        return res.status(500).json(
            new ApiResponse(500, results, 'Error fixing database issues')
        );
    }
});
