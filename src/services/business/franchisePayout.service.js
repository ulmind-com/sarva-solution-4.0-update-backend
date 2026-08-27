import mongoose from 'mongoose';
import FranchiseBvState from '../../models/FranchiseBvState.model.js';
import FranchisePayout from '../../models/FranchisePayout.model.js';
import MasterFranchiseRelation from '../../models/MasterFranchiseRelation.model.js';

class FranchisePayoutService {
    /**
     * Records BV strictly from franchise repurchases.
     * Designed as an isolated fire-and-forget hook.
     * 
     * @param {ObjectId|String} franchiseId 
     * @param {Number} bvAmount 
     */
    async recordRepurchaseBV(franchiseId, bvAmount) {
        if (!franchiseId || !bvAmount || bvAmount <= 0) return;

        try {
            await FranchiseBvState.findOneAndUpdate(
                { franchiseId: franchiseId },
                {
                    $inc: {
                        currentMonthRepurchaseBv: bvAmount,
                        lifetimeRepurchaseBv: bvAmount
                    },
                    $set: { lastUpdated: new Date() }
                },
                { upsert: true, new: true }
            );
        } catch (error) {
            console.error(`[FranchisePayout] Failed to record BV for franchise ${franchiseId}:`, error.message);
        }
    }

    /**
     * Records PV strictly from franchise 1st purchases (Activations).
     * Designed as an isolated fire-and-forget hook.
     * 
     * @param {ObjectId|String} franchiseId 
     * @param {Number} pvAmount 
     */
    async recordFirstPurchasePV(franchiseId, pvAmount) {
        if (!franchiseId || !pvAmount || pvAmount <= 0) return;

        try {
            await FranchiseBvState.findOneAndUpdate(
                { franchiseId: franchiseId },
                {
                    $inc: {
                        currentMonthFirstPurchasePv: pvAmount,
                        lifetimeFirstPurchasePv: pvAmount
                    },
                    $set: { lastUpdated: new Date() }
                },
                { upsert: true, new: true }
            );
        } catch (error) {
            console.error(`[FranchisePayout] Failed to record PV for franchise ${franchiseId}:`, error.message);
        }
    }

    /**
     * Executes the monthly cutoff.
     * Reads all active states, computes the 10% gross payout, slices 5% Admin and 2% TDS deductions,
     * writes the audit logs, and zeroes out the current month counters safely.
     * 
     * @param {Date} forceDate Optional override date for testing or delayed crons.
     */
    async generateMonthlyPayouts(forceDate = null) {
        const runDate = forceDate || new Date();
        
        // Since the script strictly runs on the 1st of the month, we are generating 
        // the payout ledger for the PREVIOUS month.
        let targetMonth = runDate.getMonth(); // 0-indexed. Example: April (3) maps to March (3).
        let targetYear = runDate.getFullYear();

        if (targetMonth === 0) {
            targetMonth = 12; // December
            targetYear -= 1;
        }

        const session = await mongoose.startSession();
        let totalProcessed = 0;

        try {
            session.startTransaction();

            // Find all franchise states with positive BV or PV this month
            const activeStates = await FranchiseBvState.find({
                $or: [
                    { currentMonthRepurchaseBv: { $gt: 0 } },
                    { currentMonthFirstPurchasePv: { $gt: 0 } }
                ]
            }).session(session);

            for (const state of activeStates) {
                let generatedBv = state.currentMonthRepurchaseBv || 0;
                let generatedPv = state.currentMonthFirstPurchasePv || 0;

                // Check if this franchise is a Master Franchise directly
                const isMaster = await MasterFranchiseRelation.exists({ masterId: state.franchiseId, isActive: true }).session(session);

                // --- 1. BV Payout Generation ---
                if (generatedBv > 0) {
                    const grossBvPayout = isMaster ? 0 : generatedBv * 0.10; // 10% ONLY if not Master
                    const adminBvCharge = isMaster ? 0 : grossBvPayout * 0.05;
                    const tdsBvCharge = isMaster ? 0 : grossBvPayout * 0.02;
                    const netBvPayout = isMaster ? 0 : grossBvPayout - adminBvCharge - tdsBvCharge;
                    const statusValBv = isMaster ? 'overridden' : 'pending';

                    await FranchisePayout.findOneAndUpdate(
                        {
                            franchiseId: state.franchiseId,
                            month: targetMonth,
                            year: targetYear,
                            payoutType: 'BV'
                        },
                        {
                            $setOnInsert: {
                                franchiseId: state.franchiseId,
                                month: targetMonth,
                                year: targetYear,
                                payoutType: 'BV',
                                totalBv: generatedBv,
                                grossPayout: parseFloat(grossBvPayout.toFixed(2)),
                                adminCharge: parseFloat(adminBvCharge.toFixed(2)),
                                tdsCharge: parseFloat(tdsBvCharge.toFixed(2)),
                                netPayout: parseFloat(netBvPayout.toFixed(2)),
                                status: statusValBv
                            }
                        },
                        { upsert: true, session }
                    );
                }

                // --- 2. PV Payout Generation ---
                if (generatedPv > 0) {
                    const grossPvPayout = isMaster ? 0 : generatedPv * 40; // Rs. 40 per PV multiplier
                    const adminPvCharge = isMaster ? 0 : grossPvPayout * 0.05;
                    const tdsPvCharge = isMaster ? 0 : grossPvPayout * 0.02;
                    const netPvPayout = isMaster ? 0 : grossPvPayout - adminPvCharge - tdsPvCharge;
                    const statusValPv = isMaster ? 'overridden' : 'pending';

                    await FranchisePayout.findOneAndUpdate(
                        {
                            franchiseId: state.franchiseId,
                            month: targetMonth,
                            year: targetYear,
                            payoutType: 'PV'
                        },
                        {
                            $setOnInsert: {
                                franchiseId: state.franchiseId,
                                month: targetMonth,
                                year: targetYear,
                                payoutType: 'PV',
                                totalPv: generatedPv,
                                grossPayout: parseFloat(grossPvPayout.toFixed(2)),
                                adminCharge: parseFloat(adminPvCharge.toFixed(2)),
                                tdsCharge: parseFloat(tdsPvCharge.toFixed(2)),
                                netPayout: parseFloat(netPvPayout.toFixed(2)),
                                status: statusValPv
                            }
                        },
                        { upsert: true, session }
                    );
                }

                // Zero out the ledger
                state.currentMonthRepurchaseBv = 0;
                state.currentMonthFirstPurchasePv = 0;
                state.lastUpdated = new Date();
                await state.save({ session });
                totalProcessed++;
            }

            await session.commitTransaction();
            console.log(`[FranchisePayout] Monthly Generation Complete. Processed ${totalProcessed} franchises for ${targetMonth}/${targetYear}.`);
            return totalProcessed;
        } catch (error) {
            await session.abortTransaction();
            console.error(`[FranchisePayout] Monthly Generation Failed:`, error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }
}

export const franchisePayoutService = new FranchisePayoutService();
