import SavingsWallet from '../../models/SavingsWallet.model.js';
import SavingsWalletCredit from '../../models/SavingsWalletCredit.model.js';

/**
 * Savings Wallet Service (ISOLATED)
 * -------------------------------------------------
 * On every user income, an extra 8% of the GROSS amount is diverted into
 * the user's Savings Wallet. This is deposit-only and fully separate from the
 * existing main wallet, TDS and admin-charge logic.
 *
 * The ONLY change required in each income service is:
 *   1. subtract this 8%-of-gross share from the net that goes to the main wallet
 *   2. call savingsWalletService.credit(...) to deposit it here
 */
export const SAVINGS_WALLET_PCT = 0.08; // 8% of gross

/** Compute the savings share (8% of gross), rounded to 2 decimals. */
export const computeSavingsShare = (grossAmount) => {
    const g = Number(grossAmount) || 0;
    if (g <= 0) return 0;
    return parseFloat((g * SAVINGS_WALLET_PCT).toFixed(2));
};

export const savingsWalletService = {
    computeShare: computeSavingsShare,

    /**
     * Credit 8% of `grossAmount` into the user's Savings Wallet and write an
     * audit log. Returns the credited amount (0 if nothing to credit).
     */
    credit: async ({ userId, memberId, sourceType, grossAmount, sourceRefId = null }) => {
        const amount = computeSavingsShare(grossAmount);
        if (amount <= 0) return 0;

        const wallet = await SavingsWallet.findOneAndUpdate(
            { user: userId },
            {
                $inc: { balance: amount, totalCredited: amount },
                $setOnInsert: { memberId }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await SavingsWalletCredit.create({
            userId,
            memberId,
            sourceType,
            sourceRefId,
            grossAmount: parseFloat(Number(grossAmount).toFixed(2)),
            percent: SAVINGS_WALLET_PCT * 100,
            amount,
            balanceAfter: wallet.balance
        });

        return amount;
    }
};

export default savingsWalletService;
