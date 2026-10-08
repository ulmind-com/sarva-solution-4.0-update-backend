import UserFinance from '../../models/UserFinance.model.js';
import Payout from '../../models/Payout.model.js';
import Configs from '../../config/config.js';
import { rankService } from './rank.service.js';
import { isolatedRankService } from './isolatedRank.service.js';
import { starMatchingRestrictionService } from './starMatchingRestriction.service.js';
import { savingsWalletService, SAVINGS_WALLET_PCT } from './savingsWallet.service.js';
import { tdsLedgerService } from './tdsLedger.service.js';
import moment from 'moment-timezone';

const TIMEZONE = "Asia/Kolkata";

/**
 * Fast Track closing rules
 * ---------------------------------------------------------------------------
 * There are no fixed time windows. A match closes the moment the PV is there.
 *
 * DAILY_CLOSING_LIMIT  how many closings a member may bank in one IST day.
 *                      Anything matched after that flushes out — the PV is
 *                      consumed, nothing is paid.
 * DEDUCTION_EVERY      every Nth closing is withheld for rank advancement, and
 *                      it keeps going for the life of the account: 3, 6, 9, 12,
 *                      15, 18 and onwards.
 * STAR_AT_CLOSING      the closing that turns the member into a Star.
 *
 * The counter is cumulative and never resets, so a day picks up where the last
 * one stopped. With 9 closings a day and a deduction every 3rd, each day lands
 * on exactly 6 paid and 3 withheld.
 */
const DAILY_CLOSING_LIMIT = 9;
const DEDUCTION_EVERY = 3;
const STAR_AT_CLOSING = 12;

export const matchingService = {

    /**
     * Helper: Check Day Change and Reset Daily Limits
     * Ensures dailyClosings count resets at midnight (00:00) IST.
     */
    checkDayChange: async (finance) => {
        const nowIST = moment().tz(TIMEZONE);
        const lastClosing = finance.fastTrack.lastClosingTime ? moment(finance.fastTrack.lastClosingTime).tz(TIMEZONE) : null;

        if (lastClosing) {
            const isSameDay = nowIST.isSame(lastClosing, 'day');

            if (!isSameDay) {
                // New Day! Reset Counters
                finance.fastTrack.dailyClosings = 0;
                finance.starMatchingBonus.dailyClosings = 0;
                // Note: We do NOT reset Carry Forward. Only Daily Limits.
                console.log(`[Matching] New Day Detected for ${finance.memberId} (IST). Resetting Daily Counters.`);
            }
        }
    },

    /**
     * Process Fast Track Bonus (PV Based)
     * Triggered when new PV is added to a leg.
     */
    processFastTrackMatching: async (userId) => {
        const finance = await UserFinance.findOne({ user: userId });
        if (!finance) return;

        // 0. Check Day Change
        await matchingService.checkDayChange(finance);

        // 1. Qualification Check (1 Direct Left, 1 Direct Right) REQUIRED FOR ALL
        const user = await import('../../models/User.model.js').then(m => m.default.findById(userId));

        if (!user || user.leftDirectActive < 1 || user.rightDirectActive < 1) {
            // console.log(`[Matching] User ${user.memberId} NOT QUALIFIED yet (Needs 1L + 1R Active Directs).`);
            return;
        }

        // 2. The day runs midnight to midnight IST — no slots inside it.
        const nowIST = moment().tz(TIMEZONE);
        const startOfTodayIST = nowIST.clone().startOf('day'); // 00:00:00 IST

        // 3. Has this member already banked today's allowance?
        // Flushed closings are not counted, so they neither pay the member nor
        // use up one of the day's nine.
        const closingsToday = await Payout.countDocuments({
            userId: userId,
            payoutType: { $in: ['fast-track-bonus', 'fast-track-deduction'] },
            createdAt: { $gte: startOfTodayIST.toDate() }
        });

        let isFlashOut = closingsToday >= DAILY_CLOSING_LIMIT;
        if (isFlashOut) {
            console.log(`[Matching] ${finance.memberId} already has ${closingsToday} closings today (limit ${DAILY_CLOSING_LIMIT}). Triggering FLASHOUT.`);
        }

        // 4. Calculate Available PV
        let leftAvailable = finance.fastTrack.pendingPairLeft + finance.fastTrack.carryForwardLeft;
        let rightAvailable = finance.fastTrack.pendingPairRight + finance.fastTrack.carryForwardRight;

        // Base Unit (Testing: 1 PV = 1 Unit)
        const UNIT_PV = 1;
        const PAYOUT_PER_MATCH = 500;

        if (leftAvailable <= 0 || rightAvailable <= 0) return;

        // 5. Check Match History (First Match 2:1 Rule)
        // We count ALL history (including flashouts) for "Is First Match"?
        // User: "1:2 or 2:1 must have to done otherwise 1:1 main paisa nhi milega"
        const allHistoryCount = await Payout.countDocuments({
            userId: userId,
            payoutType: { $in: ['fast-track-bonus', 'fast-track-deduction', 'fast-track-flashout'] }
        });
        const isFirstMatch = allHistoryCount === 0;

        let matchAmount = 0;
        let matchedLeft = 0;
        let matchedRight = 0;
        let matchTriggered = false;

        if (isFirstMatch) {
            // First Match Logic: 2:1 or 1:2
            if (leftAvailable >= 2 * UNIT_PV && rightAvailable >= 1 * UNIT_PV) {
                matchedLeft = 2 * UNIT_PV;
                matchedRight = 1 * UNIT_PV;
                matchAmount = PAYOUT_PER_MATCH;
                matchTriggered = true;
            } else if (leftAvailable >= 1 * UNIT_PV && rightAvailable >= 2 * UNIT_PV) {
                matchedLeft = 1 * UNIT_PV;
                matchedRight = 2 * UNIT_PV;
                matchAmount = PAYOUT_PER_MATCH;
                matchTriggered = true;
            }
        } else {
            // Subsequent Matches: 1:1
            if (leftAvailable >= UNIT_PV && rightAvailable >= UNIT_PV) {
                matchedLeft = UNIT_PV;
                matchedRight = UNIT_PV;
                matchAmount = PAYOUT_PER_MATCH;
                matchTriggered = true;
            }
        }

        if (!matchTriggered) return;

        // 6. Deduction & Status Logic
        let adminCharge = 0;
        let tdsAmount = 0;
        let netAmount = 0; // Default 0
        let status = 'completed';
        let payoutType = 'fast-track-bonus';
        let closingCount = 0;
        let savingsShare = 0; // ISOLATED: 8% of gross diverted to Savings Wallet

        if (isFlashOut) {
            payoutType = 'fast-track-flashout';
            status = 'flushed';
            matchAmount = 0; // Force 0
        } else {
            // Valid Payout Logic
            const ADMIN_CHARGE_PERCENT = 0.10;
            const TDS_PERCENT = 0.02;

            adminCharge = matchAmount * ADMIN_CHARGE_PERCENT;
            tdsAmount = matchAmount * TDS_PERCENT;
            netAmount = matchAmount - adminCharge - tdsAmount;

            // DEDUCTION LOGIC (3, 6, 9, 12)
            // Count ONLY valid payouts (bonus + deduction), EXCLUDING flashouts.
            const validPayoutsCount = await Payout.countDocuments({
                userId: userId,
                payoutType: { $in: ['fast-track-bonus', 'fast-track-deduction'] }
            });

            closingCount = validPayoutsCount + 1; // This is the Nth valid payout

            // Every 3rd closing is withheld, and it never stops — 3, 6, 9, 12,
            // 15, 18 and so on for as long as the account keeps matching.
            if (closingCount % DEDUCTION_EVERY === 0) {
                netAmount = 0;
                payoutType = 'fast-track-deduction';
                status = 'deducted';

                // Trigger Star Logic at the 12th closing (unchanged)
                if (closingCount === STAR_AT_CLOSING) {
                    // Mark User as Star
                    finance.isStar = true;
                    await finance.save();

                    console.log(`[Star Matching] User ${finance.memberId} is now a STAR! Propagating...`);

                    // Propagate Star +1 to Uplines
                    await matchingService.propagateStarUpwards(userId);
                }
            }
        }

        // 7. Update State
        finance.fastTrack.lastClosingTime = nowIST.toDate();

        // Only a banked closing uses up part of the daily allowance.
        if (status !== 'flushed') {
            finance.fastTrack.dailyClosings += 1;
        }

        // Reset Pending (consumed or moved to CF)
        finance.fastTrack.pendingPairLeft = 0;
        finance.fastTrack.pendingPairRight = 0;

        // Update CF with remaining
        finance.fastTrack.carryForwardLeft = leftAvailable - matchedLeft;
        finance.fastTrack.carryForwardRight = rightAvailable - matchedRight;

        // Wallet Credit (Only if +ve and Status Completed)
        if (netAmount > 0 && status === 'completed') {
            // ISOLATED: divert an extra 8% of gross to the Savings Wallet (reduces main-wallet net)
            savingsShare = parseFloat((matchAmount * SAVINGS_WALLET_PCT).toFixed(2));
            netAmount = parseFloat((netAmount - savingsShare).toFixed(2));

            finance.wallet.availableBalance += netAmount;
            finance.fastTrack.weeklyEarnings += netAmount;
            finance.wallet.totalEarnings += netAmount;
        }

        // Log Transaction
        await Payout.create({
            userId: userId,
            memberId: finance.memberId,
            payoutType,
            grossAmount: (status === 'flushed') ? 0 : matchAmount, // 0 if flushed
            adminCharge: (status === 'flushed') ? 0 : adminCharge,
            tdsDeducted: (status === 'flushed') ? 0 : tdsAmount,
            savingsDeduction: savingsShare,
            netAmount,
            status,
            metadata: {
                isFlashOut: isFlashOut,
                reason: isFlashOut ? `Daily limit of ${DAILY_CLOSING_LIMIT} closings reached` : 'Matching Bonus',
                closingCount: (status !== 'flushed') ? closingCount : undefined
            }
        });

        await finance.save();

        // ISOLATED: deposit the diverted 8% into the Savings Wallet
        if (savingsShare > 0) {
            await savingsWalletService.credit({
                userId,
                memberId: finance.memberId,
                sourceType: payoutType,
                grossAmount: matchAmount
            });

            // ISOLATED: record the 2% TDS deducted from this income (admin reporting only)
            await tdsLedgerService.record({
                userId,
                memberId: finance.memberId,
                sourceType: payoutType,
                grossAmount: matchAmount
            });
        }
    },

    /**
     * Process Star Matching Bonus
     * Triggered when Downline Rank Upgrades occur (Star Propagation).
     */
    processStarMatching: async (userId) => {
        const finance = await UserFinance.findOne({ user: userId });
        if (!finance) return;

        // 0. Check Day Change
        await matchingService.checkDayChange(finance);

        // 1. Time Slot Logic (Same as Fast Track: 12-4-8 IST)
        const nowIST = moment().tz(TIMEZONE);
        const startOfTodayIST = nowIST.clone().startOf('day');

        const currentHour = nowIST.hour();
        const slotIndex = Math.floor(currentHour / 4);

        const slotStartTime = startOfTodayIST.clone().add(slotIndex * 4, 'hours').toDate();
        const slotEndTime = startOfTodayIST.clone().add((slotIndex + 1) * 4, 'hours').toDate();

        // 2. Check for Existing Payout in THIS Slot
        const payoutsInSlot = await Payout.find({
            userId: userId,
            payoutType: { $in: ['star-matching-bonus', 'star-matching-flashout'] },
            createdAt: { $gte: slotStartTime, $lt: slotEndTime }
        });

        let isFlashOut = payoutsInSlot.length > 0;
        if (isFlashOut) {
            console.log(`[Star Matching] Slot ${slotIndex} Limit Exceeded for ${finance.memberId}. Triggering FLASH OUT.`);
        }

        // 3. Available Stars
        let leftStars = finance.starMatchingBonus.pendingStarsLeft + finance.starMatchingBonus.carryForwardStarsLeft;
        let rightStars = finance.starMatchingBonus.pendingStarsRight + finance.starMatchingBonus.carryForwardStarsRight;

        if (leftStars <= 0 || rightStars <= 0) return;

        // 4. Matching Logic
        let matchedLeft = 0;
        let matchedRight = 0;
        let matchTriggered = false;

        // CHECK HISTORY for First Star Match Rule (Including Flashouts)
        const allHistoryCount = await Payout.countDocuments({
            userId: userId,
            payoutType: { $in: ['star-matching-bonus', 'star-matching-flashout'] }
        });
        const isFirstStarMatch = allHistoryCount === 0;

        if (isFirstStarMatch) {
            // First Match: 2:1 or 1:2
            if (leftStars >= 2 && rightStars >= 1) {
                matchedLeft = 2; matchedRight = 1; matchTriggered = true;
            } else if (leftStars >= 1 && rightStars >= 2) {
                matchedLeft = 1; matchedRight = 2; matchTriggered = true;
            }
        } else {
            // Subsequent Matches: 1:1
            if (leftStars >= 1 && rightStars >= 1) {
                matchedLeft = 1; matchedRight = 1; matchTriggered = true;
            }
        }

        if (!matchTriggered) return;

        // 4b. Restriction Check (Isolated): 6th-10th events are restricted
        const { isRestricted, nextCount } = await starMatchingRestrictionService.check(userId);
        if (isRestricted && !isFlashOut) {
            isFlashOut = true;
            console.log(`[Star Matching] Event #${nextCount} RESTRICTED for ${finance.memberId}. No payout.`);
        }

        // 5. Payout & Deduction
        const PAYOUT = 1500;
        let matchAmount = PAYOUT;

        if (isFlashOut) {
            matchAmount = 0; // Flash Out
        }

        let adminCharge = 0;
        let tdsAmount = 0;
        let netAmount = 0;
        let status = 'completed';
        let payoutType = 'star-matching-bonus';
        let savingsShare = 0; // ISOLATED: 8% of gross diverted to Savings Wallet

        if (isFlashOut) {
            payoutType = 'star-matching-flashout';
            status = 'flushed';
        } else {
            const ADMIN_CHARGE_PERCENT = 0.10;
            const TDS_PERCENT = 0.02;

            adminCharge = matchAmount * ADMIN_CHARGE_PERCENT;
            tdsAmount = matchAmount * TDS_PERCENT;
            netAmount = matchAmount - adminCharge - tdsAmount;
        }

        // 6. Update State
        finance.starMatchingBonus.lastClosingTime = nowIST.toDate();

        if (status !== 'flushed') {
            finance.starMatchingBonus.dailyClosings += 1;
        }

        finance.starMatchingBonus.pendingStarsLeft = 0;
        finance.starMatchingBonus.pendingStarsRight = 0;

        finance.starMatchingBonus.carryForwardStarsLeft = leftStars - matchedLeft;
        finance.starMatchingBonus.carryForwardStarsRight = rightStars - matchedRight;

        // Wallet Credit
        if (netAmount > 0 && status === 'completed') {
            // ISOLATED: divert an extra 8% of gross to the Savings Wallet (reduces main-wallet net)
            savingsShare = parseFloat((matchAmount * SAVINGS_WALLET_PCT).toFixed(2));
            netAmount = parseFloat((netAmount - savingsShare).toFixed(2));

            finance.wallet.availableBalance += netAmount;
            finance.starMatchingBonus.weeklyEarnings += netAmount;
            finance.wallet.totalEarnings += netAmount;
        }

        await Payout.create({
            userId: userId,
            memberId: finance.memberId,
            payoutType,
            grossAmount: matchAmount,
            adminCharge,
            tdsDeducted: tdsAmount,
            savingsDeduction: savingsShare,
            netAmount,
            status,
            metadata: {
                isFlashOut: isFlashOut,
                isRestricted: isRestricted,
                restrictedCount: nextCount,
                matchedLeft,
                matchedRight
            }
        });

        // 7. Auto Rank Upgrade? 
        if (status !== 'flushed') {
            finance.starMatching += 1; // 1 Pair matched (Cumulative)
            finance.currentRankMatchCount += 1; // For Next Rank (Resets on upgrade)
        }

        await finance.save();

        // ISOLATED: deposit the diverted 8% into the Savings Wallet
        if (savingsShare > 0) {
            await savingsWalletService.credit({
                userId,
                memberId: finance.memberId,
                sourceType: payoutType,
                grossAmount: matchAmount
            });

            // ISOLATED: record the 2% TDS deducted from this income (admin reporting only)
            await tdsLedgerService.record({
                userId,
                memberId: finance.memberId,
                sourceType: payoutType,
                grossAmount: matchAmount
            });
        }

        if (status !== 'flushed') {
            // Trigger Rank Upgrade Check (Old)
            await rankService.checkRankUpgrade(userId);

            // Trigger New Isolated Rank Upgrade Check
            await isolatedRankService.checkIsolatedRankUpgrade(userId);
        }
    },

    /**
     * Propagate Star Point Upwards
     * When a user becomes a Star, their uplines get +1 Pending Star on the respective leg.
     */
    propagateStarUpwards: async (newStarUserId) => {
        const User = await import('../../models/User.model.js').then(m => m.default);
        const currentUser = await User.findById(newStarUserId);
        if (!currentUser || !currentUser.parentId) return;

        let currentMember = currentUser;

        // Traverse Up
        while (currentMember.parentId) {
            const parent = await User.findOne({ memberId: currentMember.parentId });
            if (!parent) break;

            const parentFinance = await UserFinance.findOne({ memberId: parent.memberId });
            if (parentFinance) {
                if (currentMember.position === 'left') {
                    parentFinance.starMatchingBonus.pendingStarsLeft += 1;
                } else if (currentMember.position === 'right') {
                    parentFinance.starMatchingBonus.pendingStarsRight += 1;
                }

                await parentFinance.save();

                // Trigger Star Matching for Parent
                matchingService.processStarMatching(parent._id).catch(e => console.error(e));
            }

            // Move up
            currentMember = parent;
        }
    }
};
