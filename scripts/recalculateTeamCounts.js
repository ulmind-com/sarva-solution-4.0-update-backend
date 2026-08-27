import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';
import chalk from 'chalk';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const runScript = async () => {
    await connectDB();
    console.log(chalk.blue('Starting Perfect Data Sync...'));

    try {
        // 1. Reset all counts
        console.log(chalk.yellow('Resetting all user counts to 0...'));
        await User.updateMany({}, {
            leftDirectActive: 0,
            leftDirectInactive: 0,
            rightDirectActive: 0,
            rightDirectInactive: 0,
            leftTeamCount: 0,
            rightTeamCount: 0,
            $unset: { leftDirectSponsors: "", rightDirectSponsors: "" }
        });

        // 2. Fetch all users into memory
        console.log(chalk.cyan('Fetching all users...'));
        const allUsers = await User.find({})
            .select('_id memberId parentId sponsorId leftChild rightChild position status')
            .lean();

        console.log(chalk.green(`Loaded ${allUsers.length} users.`));

        // Create Maps for O(1) Access
        const userMap = new Map();
        const memberIdMap = new Map();

        allUsers.forEach(u => {
            userMap.set(u._id.toString(), u);
            memberIdMap.set(u.memberId, u);
        });

        // Memoization Cache for Recursive Team Counts
        const legCountCache = new Map();

        // --- Helper: Recursive Team Count (Memoized) ---
        const getRecursiveTeamCount = (userId) => {
            if (!userId) return 0;
            const strId = userId.toString();

            if (legCountCache.has(strId)) return legCountCache.get(strId);

            const user = userMap.get(strId);
            if (!user) {
                console.log(chalk.red(`Debug: User ${strId} not found in map. Map size: ${userMap.size}`));
                // Check if map has this key in any form?
                // console.log('Keys sample:', [...userMap.keys()].slice(0, 5));
                return 0;
            }

            // Debug for SVS000012 chain
            if (user.memberId === 'SVS000015') {
                console.log(`Debug: calculating for SVS000015. Left: ${user.leftChild}, Right: ${user.rightChild}`);
            }

            const leftCount = getRecursiveTeamCount(user.leftChild);
            const rightCount = getRecursiveTeamCount(user.rightChild);

            const total = 1 + leftCount + rightCount; // 1 (self) + subtrees
            legCountCache.set(strId, total);
            return total;
        };

        // --- Helper: Find Sponsor Leg (Traverse Up) ---
        const findSponsorLeg = (child, sponsorMemberId) => {
            // Check direct parents until we find sponsor or root
            let current = child;
            while (current && current.parentId) {
                const parentIdStr = typeof current.parentId === 'object' ? current.parentId.toString() : current.parentId;
                // Wait, parentId in schema is String (memberId) usually, let's check schema.
                // Schema says: parentId: { type: String, default: null } -> It's memberId!

                // We need to find the User object for this parentMemberId
                // Optimization: Create memberId Map
                const parent = allUsers.find(u => u.memberId === parentIdStr);

                if (!parent) break;

                if (parent.memberId === sponsorMemberId) {
                    // Found Sponsor! Now which child path did we come from?
                    if (parent.leftChild && parent.leftChild.toString() === current._id.toString()) return 'left';
                    if (parent.rightChild && parent.rightChild.toString() === current._id.toString()) return 'right';

                    // Note: If 'current' was further down, we need to know which leg of 'parent' 'current' is in.
                    // But 'current' stores its 'position' relative to 'parent' in schema?
                    // Schema: position: { type: String, enum: ['left', 'right', 'root'] }
                    // Yes, user.position tells us which leg of parent they are in.

                    // Actually, simpler:
                    // If we find the sponsor, we need to know if the *starting user* belongs to sponsor's left or right tree.
                    // We can re-traverse downwards? No, slow.
                    // We can trace upwards and remember the "first step" taken from the sponsor?
                    break;
                }
                current = parent;
            }
            return null;
        };

        // Correct approach for Sponsor Leg:
        // Use the 'position' field?
        // No, 'position' is relative to immediate parent. Sponsor might be 5 levels up.
        // We need to see if the user is in the sponsor's left tree or right tree.
        // We can use the isAncestor check with memoization or simply rely on the DFS property.

        // Optimized Sponsor Update Loop
        const sponsorUpdates = new Map(); // Map<SponsorID, {lA, lI, rA, rI}>

        const initStats = () => ({ lA: 0, lI: 0, rA: 0, rI: 0 });

        // --- Helper: Check ancestry using map (Traverse Up) ---
        const isDescendant = (ancestorId, targetId) => {
            let curr = userMap.get(targetId.toString());
            const ancestorIdStr = ancestorId.toString();

            while (curr) {
                if (curr._id.toString() === ancestorIdStr) return true;
                if (!curr.parentId) break;

                // Optimized Lookup O(1)
                const parent = memberIdMap.get(curr.parentId);
                if (!parent) break;

                if (parent._id.toString() === ancestorIdStr) return true;
                curr = parent;
            }
            return false;
        };

        // --- Helper: Recursive Financials (Memoized) ---
        const financialCache = new Map();
        const getRecursiveFinancials = (userId) => {
            if (!userId) return { bv: 0, pv: 0 };
            const strId = userId.toString();
            if (financialCache.has(strId)) return financialCache.get(strId);

            const user = userMap.get(strId);
            if (!user) return { bv: 0, pv: 0 };

            // Inactive users contribute 0 to the upline
            if (user.status !== 'active') {
                financialCache.set(strId, { bv: 0, pv: 0 });
                return { bv: 0, pv: 0 };
            }

            const left = getRecursiveFinancials(user.leftChild);
            const right = getRecursiveFinancials(user.rightChild);

            const pBV = user.personalBV || 0;
            const pPV = user.personalPV !== undefined ? user.personalPV : pBV; // Backfill

            const totalBV = pBV + left.bv + right.bv;
            const totalPV = pPV + left.pv + right.pv;

            financialCache.set(strId, { bv: totalBV, pv: totalPV });
            return { bv: totalBV, pv: totalPV };
        };

        // Let's iterate all users to calculate their 'Team Counts' and 'Financials'
        console.log(chalk.cyan('Calculating recursive team counts & financials...'));
        const updates = [];

        for (const user of allUsers) {
            // 1. Team Counts
            const lCount = getRecursiveTeamCount(user.leftChild);
            const rCount = getRecursiveTeamCount(user.rightChild);

            // 2. Financials
            const lFin = getRecursiveFinancials(user.leftChild);
            const rFin = getRecursiveFinancials(user.rightChild);

            // Prepare Update
            const updateDoc = {
                leftTeamCount: lCount,
                rightTeamCount: rCount,
                leftLegBV: lFin.bv,
                rightLegBV: rFin.bv,
                leftLegPV: lFin.pv,
                rightLegPV: rFin.pv
            };

            // Backfill Personal PV for Active Users if 0/undefined
            if (user.status === 'active' && !user.personalPV && user.personalBV > 0) {
                updateDoc.personalPV = user.personalBV;
            }

            // Rule: Inactive users have 0 BV & PV (Flashout)
            if (user.status !== 'active') {
                updateDoc.personalBV = 0;
                updateDoc.totalBV = 0;
                updateDoc.leftLegBV = 0;
                updateDoc.rightLegBV = 0;
                updateDoc.thisMonthBV = 0;
                updateDoc.thisYearBV = 0;
                updateDoc.carryForwardLeft = 0;
                updateDoc.carryForwardRight = 0;

                // PV Flashout
                updateDoc.personalPV = 0;
                updateDoc.totalPV = 0;
                updateDoc.leftLegPV = 0;
                updateDoc.rightLegPV = 0;
                updateDoc.thisMonthPV = 0;
                updateDoc.thisYearPV = 0;
            } else {
                // Update Total Cumulative (Group)
                updateDoc.totalBV = (user.personalBV || 0) + lFin.bv + rFin.bv;
                updateDoc.totalPV = (updateDoc.personalPV || user.personalPV || 0) + lFin.pv + rFin.pv;
            }

            updates.push({
                updateOne: {
                    filter: { _id: user._id },
                    update: updateDoc
                }
            });

            // Handle Sponsor Stats
            if (user.sponsorId) {
                // Find sponsor
                const sponsor = memberIdMap.get(user.sponsorId);
                if (sponsor) {
                    const isActive = user.status === 'active';
                    let leg = null;

                    // Determine Leg
                    // 1. Check direct children
                    if (sponsor.leftChild && sponsor.leftChild.toString() === user._id.toString()) leg = 'left';
                    else if (sponsor.rightChild && sponsor.rightChild.toString() === user._id.toString()) leg = 'right';
                    else {
                        // 2. Deep check
                        if (sponsor.leftChild && isDescendant(sponsor.leftChild, user._id)) leg = 'left';
                        else if (sponsor.rightChild && isDescendant(sponsor.rightChild, user._id)) leg = 'right';
                    }

                    if (leg) {
                        // Queue update for sponsor
                        // We can't update directly here efficiently, better to aggregate first
                        const sId = sponsor._id.toString();
                        if (!sponsorUpdates.has(sId)) sponsorUpdates.set(sId, initStats());
                        const stats = sponsorUpdates.get(sId);

                        if (leg === 'left') {
                            if (isActive) stats.lA++; else stats.lI++;
                        } else {
                            if (isActive) stats.rA++; else stats.rI++;
                        }

                        // Also update User's sponsorLeg field
                        updates.push({
                            updateOne: {
                                filter: { _id: user._id },
                                update: { sponsorLeg: leg }
                            }
                        });
                    }
                }
            }
        }

        // Add Sponsor Stats updates to bulk operations
        for (const [sId, stats] of sponsorUpdates) {
            updates.push({
                updateOne: {
                    filter: { _id: sId },
                    update: {
                        leftDirectActive: stats.lA,
                        leftDirectInactive: stats.lI,
                        rightDirectActive: stats.rA,
                        rightDirectInactive: stats.rI
                    }
                }
            });
        }

        console.log(chalk.blue(`Applying ${updates.length} updates...`));
        // Bulk Write
        if (updates.length > 0) {
            await User.bulkWrite(updates);
        }

        console.log(chalk.green('Sync Complete! All data is perfectly consistent.'));
        process.exit(0);

    } catch (e) {
        console.error(chalk.red('Sync Failed:'), e);
        process.exit(1);
    }
};

runScript();
