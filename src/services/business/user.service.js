import User from '../../models/User.model.js';
import BankAccount from '../../models/BankAccount.model.js';

/**
 * Service to handle generic User and BankAccount logic.
 */
export const userService = {
    /**
     * Get user profile with bank details
     */
    getUserWithBank: async (userId) => {
        const user = await User.findById(userId).select('-password');
        const bankAccount = await BankAccount.findOne({ userId });
        return { user, bankAccount };
    },

    /**
     * Update or create bank account
     */
    syncBankAccount: async (userId, bankDetails) => {
        let bankAccount = await BankAccount.findOne({ userId });
        if (bankAccount) {
            Object.assign(bankAccount, bankDetails);
            return await bankAccount.save();
        } else {
            bankAccount = new BankAccount({ ...bankDetails, userId });
            return await bankAccount.save();
        }
    }
};
