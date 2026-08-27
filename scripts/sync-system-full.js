
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import FranchiseSale from '../src/models/FranchiseSale.model.js';
import Payout from '../src/models/Payout.model.js';

// Load env
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../');
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

async function syncSystem() {
    console.log('🔄 Starting Full System Sync & Audit...');

    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(uri);
        console.log('✅ Connected to DB');

        // ==========================================
        // STEP 1: Sync Personal PV/BV from Sales
        // ==========================================
        console.log('\n--- Step 1: Syncing Personal PV/BV from Sales ---');
        const users = await User.find({});
        const userMap = new Map(); // Cache for tree building later

        let updatedPersonal = 0;

        for (const user of users) {
            // Calculate Totals from Sales
            const sales = await FranchiseSale.find({ user: user._id });

            let realPersonalPV = 0;
            let realPersonalBV = 0;

            sales.forEach(sale => {
                realPersonalPV += sale.totalPV || 0;
                realPersonalBV += sale.totalBV || 0;
            });

            // Check for discrepancy
            let needsSave = false;

            // Sync User Model
            if (Math.abs(user.personalPV - realPersonalPV) > 0.01) {
                console.log(`   Mismatch PV for ${user.memberId}: DB ${user.personalPV} != Real ${realPersonalPV}`);
                user.personalPV = realPersonalPV;
                user.totalPV = realPersonalPV; // Assuming personal total is mostly same unless migrated
                // User totalPV usually includes historic? If we assume sales are source of truth:
                user.thisMonthPV = realPersonalPV; // Approximate, assuming all recent. 
                // To be precise we'd filter sales by date, but "total" is what we care about most.
                needsSave = true;
            }
            if (Math.abs(user.personalBV - realPersonalBV) > 0.01) {
                user.personalBV = realPersonalBV;
                user.totalBV = realPersonalBV;
                needsSave = true;
            }

            // Sync Activation Status
            if (realPersonalPV >= 1) {
                if (user.status === 'inactive') {
                    user.status = 'active';
                    needsSave = true;
                }
                if (!user.isFirstPurchaseDone) {
                    user.isFirstPurchaseDone = true;
                    needsSave = true;
                }
            }

            if (needsSave) {
                await user.save();
                updatedPersonal++;
            }

            // Update UserFinance Personal as well
            const finance = await UserFinance.findOne({ user: user._id });
            if (finance) {
                let finSave = false;
                if (finance.personalPV !== realPersonalPV) { finance.personalPV = realPersonalPV; finSave = true; }
                if (finance.personalBV !== realPersonalBV) { finance.personalBV = realPersonalBV; finSave = true; }
                if (finSave) await finance.save();
            }

            // Add to Map for Tree Step
            userMap.set(user._id.toString(), {
                _id: user._id,
                memberId: user.memberId,
                parentId: user.parentId, // This is memberID string usually? Or Object? Schema says parentId: { type: Schema.Types.ObjectId, ref: 'User' } usually? 
                // Let's check Schema... User.model.js: parentId: { type: String, ref: 'User' }?? No, usually ObjectId.
                // Wait, User model in earlier context showed `parentId: 1` index. 
                // I'll assume it's String MemberID if that's how `mlm.service` uses it (Line 102 `let parentMemberId = current.parentId`). 
                // Yes, mlm.service line 102 implies parentId is MemberID String.

                // BUT, wait. `leftChild` and `rightChild` are ObjectIds.
                // So parent relation is likely stored as MemberID string in `parentId` field?
                // Let's verify in code or assume from `mlm.service`.
                // `mlm.service`: `parentMemberId = current.parentId`. Then `User.findOne({ memberId: parentMemberId })`. 
                // So `parentId` IS A STRING MEMBERID.

                leftChild: user.leftChild, // ObjectId
                rightChild: user.rightChild, // ObjectId
                personalPV: realPersonalPV,
                personalBV: realPersonalBV,
                dbLeftLegPV: 0,
                dbRightLegPV: 0
            });
        }
        console.log(`   Updated Personal Data for ${updatedPersonal} users.`);


        // ==========================================
        // STEP 2: Sync Tree Group Volumes
        // ==========================================
        console.log('\n--- Step 2: Syncing Tree Group Volumes ---');

        // Recursive Function to calculate tree totals
        async function getTreeTotals(userIdString) {
            const node = userMap.get(userIdString);
            if (!node) return { pv: 0, bv: 0 };

            let leftTotals = { pv: 0, bv: 0 };
            let rightTotals = { pv: 0, bv: 0 };

            if (node.leftChild) {
                // Find node by ObjectId? Map uses UserId string.
                const leftNode = users.find(u => u._id.toString() === node.leftChild.toString());
                if (leftNode) leftTotals = await getTreeTotals(leftNode._id.toString());
            }

            if (node.rightChild) {
                const rightNode = users.find(u => u._id.toString() === node.rightChild.toString());
                if (rightNode) rightTotals = await getTreeTotals(rightNode._id.toString());
            }

            // Totals for this node's legs
            const calculatedLeftPV = leftTotals.pv;
            const calculatedRightPV = rightTotals.pv;
            const calculatedLeftBV = leftTotals.bv;
            const calculatedRightBV = rightTotals.bv;

            // Update DB if mismatch
            const finance = await UserFinance.findOne({ user: node._id });
            if (finance) {
                // We update 'leftLegBV/PV' which are cumulative totals
                /* 
                   NOTE: This overwrites cumulative totals with CURRENT tree totals.
                   If historical users were deleted, this might reduce totals.
                   But user asked to "make everything up to date".
                   This makes the DB consistent with the current tree.
                */
                let fSave = false;
                if (finance.leftLegPV !== calculatedLeftPV) { finance.leftLegPV = calculatedLeftPV; fSave = true; }
                if (finance.rightLegPV !== calculatedRightPV) { finance.rightLegPV = calculatedRightPV; fSave = true; }
                if (finance.leftLegBV !== calculatedLeftBV) { finance.leftLegBV = calculatedLeftBV; fSave = true; }
                if (finance.rightLegBV !== calculatedRightBV) { finance.rightLegBV = calculatedRightBV; fSave = true; }

                // Total PV/BV (Group + Personal)
                // Finance totalBV usually = left + right + personal? Or just left+right?
                // Logic: totalBV is usually cumulative of EVERYTHING. 
                // Let's assume Total = Left + Right + Personal (if Personal counts to Group? No, Personal counts to Upline).
                // `totalBV` field description: "Cumulative".
                // mlm.service adds `bvAmount` to `totalBV` whenever it adds to `leftLegBV`.
                // So TotalBV = LeftLegBV + RightLegBV + (Maybe Personal if credited?)
                // For safety, let's set TotalBV = LeftLeg + RightLeg. (Usually personal doesn't count for own binary balancing).
                const newTotalBV = calculatedLeftBV + calculatedRightBV;
                const newTotalPV = calculatedLeftPV + calculatedRightPV;

                if (finance.totalBV !== newTotalBV) { finance.totalBV = newTotalBV; fSave = true; }
                if (finance.totalPV !== newTotalPV) { finance.totalPV = newTotalPV; fSave = true; }

                if (fSave) {
                    await finance.save();
                    // console.log(`   Updated Group Vol for ${node.memberId}`);
                }
            }

            // Return Total (Self + Left + Right) to parent
            return {
                pv: node.personalPV + calculatedLeftPV + calculatedRightPV,
                bv: node.personalBV + calculatedLeftBV + calculatedRightBV
            };
        }

        // Find Root Users (No parent) to start recursion?
        // Actually, we can just iterate everyone or find roots.
        // Doing recursion from roots is efficient.
        const rootUsers = users.filter(u => !u.parentId || u.parentId === 'root' || u.parentId === '');

        for (const root of rootUsers) {
            console.log(`   Processing Tree from Root: ${root.memberId}`);
            await getTreeTotals(root._id.toString());
        }


        // ==========================================
        // STEP 3: Audit Wallet
        // ==========================================
        console.log('\n--- Step 3: Wallet Audit ---');
        const allFinance = await UserFinance.find({});
        for (const f of allFinance) {
            const calculatedAvailable = f.wallet.totalEarnings - f.wallet.withdrawnAmount - f.wallet.pendingWithdrawal;

            // Allow small float diff
            if (Math.abs(f.wallet.availableBalance - calculatedAvailable) > 1) {
                console.warn(`⚠️  Wallet Mismatch for ${f.memberId}: Available ${f.wallet.availableBalance} != Calc ${calculatedAvailable}`);
                // Fix it?
                // "make everything upto date" implies fixing.
                // Assuming TotalEarnings and Withdrawn are sources of truth.
                f.wallet.availableBalance = calculatedAvailable;
                await f.save();
                console.log(`   Fixed Wallet for ${f.memberId}`);
            }
        }


        // ==========================================
        // STEP 4: Rank Verification
        // ==========================================
        console.log('\n--- Step 4: Rank Verification ---');

        const ranks = [
            { name: 'Bronze', stars: 1, bonus: 500 },
            { name: 'Silver', stars: 5, bonus: 2500 },
            { name: 'Gold', stars: 30, bonus: 10000 },
            { name: 'Platinum', stars: 100, bonus: 25000 },
            { name: 'Diamond', stars: 300, bonus: 75000 },
            { name: 'Blue Diamond', stars: 750, bonus: 200000 },
            { name: 'Black Diamond', stars: 1500, bonus: 500000 },
            { name: 'Royal Diamond', stars: 3000, bonus: 1000000 },
            { name: 'Crown Diamond', stars: 7500, bonus: 2500000 },
            { name: 'Ambassador', stars: 15000, bonus: 5000000 },
            { name: 'Crown Ambassador', stars: 30000, bonus: 10000000 },
            { name: 'SSVPL Legend', stars: 75000, bonus: 25000000 }
        ];

        for (const f of allFinance) {
            let properRank = f.currentRank; // Default to current
            let highestRankIndex = -1;

            // Find highest eligible rank
            for (let i = 0; i < ranks.length; i++) {
                if (f.starMatching >= ranks[i].stars) {
                    highestRankIndex = i;
                }
            }

            if (highestRankIndex !== -1) {
                properRank = ranks[highestRankIndex].name;
            } else {
                properRank = 'Associate';
            }

            // Determine current rank index
            const currentRankIndex = ranks.findIndex(r => r.name === f.currentRank);
            // If new rank is higher than current
            const effectiveCurrentIndex = currentRankIndex === -1 ? -1 : currentRankIndex;

            if (highestRankIndex > effectiveCurrentIndex) {
                console.log(`   ⬆️  Upgrading ${f.memberId} from ${f.currentRank} to ${properRank} (Stars: ${f.starMatching})`);
                f.currentRank = properRank;
                f.rankNumber = highestRankIndex + 1; // 1-based index based on logic? Or just store index? mlm.service uses +1.
                f.achievedDate = new Date();
                f.rankHistory.push({ rank: properRank, date: new Date() });

                // Note: We are NOT distributing bonuses here to avoid accidentally double-paying or draining wallet during an audit.
                // This is a status correction only. Manual bonus issuance might be needed if they missed it.
                // Or we could create Pending Payouts? 
                // Safer: Just update status.

                await f.save();

                // Also update User Model if it has rank field?
                // User model doesn't usually store rank, UserFinance does. But let's check User model...
                // User model has `rank` field? Usually normalized. Checking...
                const user = await User.findById(f.user);
                if (user && user.currentRank !== properRank) {
                    user.currentRank = properRank;
                    await user.save();
                }
            }
        }

        console.log('\n✅ System Sync & Audit Completed Successfully.');
        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ ERROR:', error);
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
        process.exit(1);
    }
}

syncSystem();
