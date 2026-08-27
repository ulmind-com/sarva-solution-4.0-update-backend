import User from '../../models/User.model.js';
import Payout from '../../models/Payout.model.js';
import { ApiError } from '../../utils/ApiError.js';
import moment from 'moment-timezone';

/**
 * Service to handle withdrawals and payout management.
 */
export const payoutService = {
    /**
     * Validate if a user can request a payout
     */
    validateWithdrawal: async (userId, amount) => {
        const user = await User.findById(userId);
        if (!user) throw new ApiError(404, 'User not found');

        if (amount < user.compliance.minimumWithdrawal) {
            throw new ApiError(400, `Minimum withdrawal amount is Rs.${user.compliance.minimumWithdrawal}`);
        }

        if (user.wallet.availableBalance < amount) {
            throw new ApiError(400, 'Insufficient balance in wallet');
        }

        return user;
    },

    /**
     * Request a withdrawal
     */
    requestWithdrawal: async (userId, requestedAmount) => {
        const user = await payoutService.validateWithdrawal(userId, requestedAmount);

        // Deductions
        const adminCharge = requestedAmount * (user.compliance.adminChargePercent / 100);
        const tdsAmount = requestedAmount * 0.02; // 2% TDS
        const netAmount = requestedAmount - adminCharge - tdsAmount;

        const payout = await Payout.create({
            userId,
            memberId: user.memberId,
            payoutType: 'direct-referral', // generic withdrawal type
            grossAmount: requestedAmount,
            adminCharge,
            tdsDeducted: tdsAmount,
            netAmount,
            status: 'pending',
            scheduledFor: payoutService.getNextPayoutDate()
        });

        // Deduct from available balance immediately to prevent double withdrawal
        user.wallet.availableBalance -= requestedAmount;
        user.wallet.pendingWithdrawal += netAmount;
        user.wallet.withdrawnAmount += requestedAmount;
        await user.save();

        return payout;
    },

    /**
     * Helper to get next Friday (SSVPL Payout day)
     */
    getNextPayoutDate: () => {
        // Get current time in IST
        const today = moment().tz("Asia/Kolkata");

        // Calculate days until next Friday (5)
        // IsoWeekday: 1=Mon ... 5=Fri ... 7=Sun
        const dayOfWeek = today.isoWeekday();
        const targetDay = 5; // Friday

        let daysToAdd = targetDay - dayOfWeek;
        if (daysToAdd <= 0) {
            daysToAdd += 7; // If today is Friday or later, target next week
        }

        const nextFriday = today.add(daysToAdd, 'days');

        // Set to 11:00 AM IST as per original intent (was setHours(11))
        nextFriday.hour(11).minute(0).second(0).millisecond(0);

        return nextFriday.toDate(); // Return as JS Date object (UTC equivalent)
    }
};
