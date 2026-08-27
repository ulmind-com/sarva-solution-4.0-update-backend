
import UserFinance from '../../models/UserFinance.model.js';
import User from '../../models/User.model.js';
import { matchingService } from './matching.service.js';
import BVTransaction from '../../models/BVTransaction.model.js';
import Payout from '../../models/Payout.model.js';
import Configs from '../../config/config.js';
import chalk from 'chalk';

/**
 * Service to handle Genealogy Tree logic and BV propagation.
 */
export const mlmService = {
    /**
     * Find extreme left available position (spillover)
     */
    findExtremeLeftPosition: async (parentUser) => {
        let current = parentUser;
        while (true) {
            if (!current) throw new Error('Invalid node iteration');

            if (!current.leftChild) {
                return { parentId: current.memberId, position: 'left' };
            }

            // Traverse Left (Linking uses ObjectId)
            const nextNodeId = current.leftChild;
            const nextNode = await User.findById(nextNodeId);

            if (!nextNode) {
                return { parentId: current.memberId, position: 'left' };
            }

            current = nextNode;
        }
        throw new Error('Could not find available position in the tree');
    },

    /**
     * Find extreme right available position (spillover for right leg)
     */
    findExtremeRightPosition: async (parentUser) => {
        let current = parentUser;
        while (true) {
            if (!current) throw new Error('Invalid node iteration');

            if (!current.rightChild) {
                return { parentId: current.memberId, position: 'right' };
            }

            // Traverse Right
            const nextNodeId = current.rightChild;
            const nextNode = await User.findById(nextNodeId);

            if (!nextNode) {
                return { parentId: current.memberId, position: 'right' };
            }

            current = nextNode;
        }
        throw new Error('Could not find available position in the tree');
    },

    /**
     * Find available position in binary tree
     */
    findAvailablePosition: async (sponsorId, preferredPosition = null) => {
        const sponsor = await User.findOne({ memberId: sponsorId });
        if (!sponsor) throw new Error('Sponsor not found');

        if (preferredPosition === 'left') {
            if (!sponsor.leftChild) {
                return { parentId: sponsor.memberId, position: 'left' };
            } else {
                const leftChild = await User.findById(sponsor.leftChild);
                if (!leftChild) return { parentId: sponsor.memberId, position: 'left' };
                return await mlmService.findExtremeLeftPosition(leftChild);
            }
        }

        if (preferredPosition === 'right') {
            if (!sponsor.rightChild) {
                return { parentId: sponsor.memberId, position: 'right' };
            } else {
                const rightChild = await User.findById(sponsor.rightChild);
                if (!rightChild) return { parentId: sponsor.memberId, position: 'right' };
                return await mlmService.findExtremeRightPosition(rightChild);
            }
        }

        return await mlmService.findExtremeLeftPosition(sponsor);
    },

    /**
     * Propagate BV & PV up the entire upline chain
     */
    propagateBVUpTree: async (userId, position, bvAmount, transactionType = 'joining', referenceId = null, pvAmount = 0) => {
        let current = await User.findById(userId);
        if (!current) return;

        // Start from parent
        let parentMemberId = current.parentId; // String MemberID
        let currentPosition = current.position;

        while (parentMemberId) {
            // Revert to findOne for String MemberID
            const parent = await User.findOne({ memberId: parentMemberId });
            if (!parent) break;

            if (parent.status === 'active') { // Only active accumulate
                // --- Update UserFinance ---
                let userFinance = await UserFinance.findOne({ user: parent._id });
                if (!userFinance) {
                    userFinance = new UserFinance({ user: parent._id, memberId: parent.memberId });
                }

                if (currentPosition === 'left') {
                    userFinance.leftLegBV += bvAmount;
                    userFinance.leftLegPV += pvAmount;
                    userFinance.fastTrack.pendingPairLeft += pvAmount;

                    // Sync User Model
                    parent.leftLegBV += bvAmount;
                    parent.leftLegPV += pvAmount;
                } else {
                    userFinance.rightLegBV += bvAmount;
                    userFinance.rightLegPV += pvAmount;
                    userFinance.fastTrack.pendingPairRight += pvAmount;

                    // Sync User Model
                    parent.rightLegBV += bvAmount;
                    parent.rightLegPV += pvAmount;
                }
                userFinance.totalBV += bvAmount;
                userFinance.totalPV += pvAmount;

                userFinance.thisMonthBV += bvAmount;
                userFinance.thisMonthPV += pvAmount;

                userFinance.thisYearBV += bvAmount;
                userFinance.thisYearPV += pvAmount;

                // Sync User Model Totals
                parent.totalBV += bvAmount;
                parent.totalPV += pvAmount;
                parent.thisMonthPV += pvAmount;
                parent.thisYearPV += pvAmount;
                parent.thisMonthBV += bvAmount;
                parent.thisYearBV += bvAmount;

                await userFinance.save();
                await parent.save();

                // Trigger Fast Track Bonus (PV Based)
                if (pvAmount > 0) {
                    await matchingService.processFastTrackMatching(parent._id);
                }

                await BVTransaction.create({
                    userId: parent._id,
                    transactionType,
                    bvAmount,
                    pvAmount,
                    legAffected: currentPosition,
                    fromUserId: userId,
                    referenceId
                });
            }

            // Move up
            currentPosition = parent.position;
            parentMemberId = parent.parentId;
        }
    },

    // ... (rest of service unchanged)
    checkFirstMatching: async (user) => {
        if (user.starMatching > 0) return true;

        const finance = await UserFinance.findOne({ user: user._id });
        if (!finance) return false;

        const left = finance.leftLegBV + finance.carryForwardLeft;
        const right = finance.rightLegBV + finance.carryForwardRight;

        if ((left >= 1000 && right >= 500) || (left >= 500 && right >= 1000)) {
            return true;
        }
        return false;
    },

    calculateBinaryMatching: async (userId) => { },

    checkRankUpgrade: async (userId) => {
        const user = await User.findById(userId);
        if (!user || user.status !== 'active') return;

        const userFinance = await UserFinance.findOne({ user: user._id });
        if (!userFinance) return;

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

        let newRank = userFinance.currentRank;
        let rankBonus = 0;

        for (const r of ranks) {
            if (userFinance.starMatching >= r.stars) {
                const currentIndex = ranks.findIndex(rk => rk.name === userFinance.currentRank);
                const candidateIndex = ranks.findIndex(rk => rk.name === r.name);

                // Treat 'Associate' as index -1
                const effectiveCurrentIndex = currentIndex === -1 ? -1 : currentIndex;

                if (candidateIndex > effectiveCurrentIndex) {
                    newRank = r.name;
                    rankBonus = r.bonus;
                }
            }
        }

        // === OLD RANK BONUS DISABLED ===
        // if (newRank !== userFinance.currentRank) {
        //     userFinance.currentRank = newRank;
        //     const idx = ranks.findIndex(r => r.name === newRank);
        //     userFinance.rankNumber = idx + 1;
        //     userFinance.achievedDate = new Date();
        //     userFinance.rankHistory.push({ rank: newRank });

        //     if (rankBonus > 0) {
        //         const adminCharge = rankBonus * 0.05;
        //         const netAmount = rankBonus * 0.95;

        //         await Payout.create({
        //             userId: user._id,
        //             memberId: user.memberId,
        //             payoutType: 'rank-bonus', // Enum fixed
        //             grossAmount: rankBonus,
        //             adminCharge: adminCharge,
        //             netAmount: netAmount,
        //             status: 'pending'
        //         });
        //         userFinance.wallet.availableBalance += netAmount;
        //     }
        //     await userFinance.save();
        // }
    },

    updateSponsorDirectCount: async (newUser) => {
        const sponsor = await User.findOne({ memberId: newUser.sponsorId });
        if (!sponsor) return;

        // Determine if new user is on sponsor's Left or Right leg
        // We need to trace down from sponsor to finding newUser? 
        // OR rely on `newUser.sponsorLeg` if we stored it?
        // In User model we added `sponsorLeg`. If available use it.
        // If not, we have to find out.
        // Fast way: check `sponsor.leftChild` or `sponsor.rightChild`?
        // No, direct can be deep down (spillover).

        // Efficient way: We just need to know if `newUser` is in `sponsor.leftChild` hierarchy or `rightChild`.
        // But `mlmService.findAvailablePosition` placed them.
        // If `newUser.position` relative to parent is known...
        // Wait, `sponsorLeg` was added to schema but might not be populated in old logic.
        // Let's rely on `newUser.sponsorLeg`. If not set, we might need traversal (expensive).
        // Let's assume we set it or will set it.

        let position = newUser.sponsorLeg;

        if (!position || position === 'none') {
            // Fallback: Check if newUser is descendant of left or right child of sponsor
            // This is heavy.
            // Better: update `register_user` to set `sponsorLeg`.
            // FOR NOW: We will fetch it if possible.
            // Actually, in `register_user`, we didn't set `sponsorLeg`. We should.
            // But let's assume we can fix it.

            // Alternative: traverse UP from newUser until we find Sponsor. 
            // The child of Sponsor we came from tells us the leg.
            let current = newUser;
            let parentId = newUser.parentId;
            while (parentId) {
                if (parentId === sponsor.memberId) {
                    // Found sponsor. `current` is the direct child of sponsor. (Or is it?)
                    // No, `current.parentId` is sponsor.
                    // So `current` is the child.
                    // Check `current.position` relative to sponsor.
                    // Sponsor's leftChild ID == current._id?
                    if (sponsor.leftChild && sponsor.leftChild.equals(current._id)) position = 'left';
                    else if (sponsor.rightChild && sponsor.rightChild.equals(current._id)) position = 'right';
                    break;
                }
                const parent = await User.findOne({ memberId: parentId });
                if (!parent) break;
                current = parent;
                parentId = parent.parentId;
            }
        }

        if (position === 'left') {
            if (newUser.status === 'active') sponsor.leftDirectActive += 1;
            else sponsor.leftDirectInactive += 1;
        } else if (position === 'right') {
            if (newUser.status === 'active') sponsor.rightDirectActive += 1;
            else sponsor.rightDirectInactive += 1;
        }

        await sponsor.save();
    },

    /**
     * Handle User Activation Event (Updates Sponsor Counts)
     */
    handleUserActivation: async (user) => {
        const sponsor = await User.findOne({ memberId: user.sponsorId });
        if (!sponsor) return;

        // Determine position (same logic as updateSponsorDirectCount or helper)
        let position = user.sponsorLeg;
        if (!position || position === 'none') {
            // Fallback traversal
            let current = user;
            let parentId = user.parentId;
            while (parentId) {
                if (parentId === sponsor.memberId) {
                    if (sponsor.leftChild && sponsor.leftChild.equals(current._id)) position = 'left';
                    else if (sponsor.rightChild && sponsor.rightChild.equals(current._id)) position = 'right';
                    break;
                }
                const parent = await User.findOne({ memberId: parentId });
                if (!parent) break;
                current = parent;
                parentId = parent.parentId;
            }
        }

        if (position === 'left') {
            sponsor.leftDirectInactive = Math.max(0, sponsor.leftDirectInactive - 1);
            sponsor.leftDirectActive += 1;
        } else if (position === 'right') {
            sponsor.rightDirectInactive = Math.max(0, sponsor.rightDirectInactive - 1);
            sponsor.rightDirectActive += 1;
        }

        await sponsor.save();

        // --- NEW: Propagate Active/Inactive Count Changes Up the Tree ---
        let current = user;
        let parentId = user.parentId;
        let currentPosition = user.position; // Position relative to immediate parent

        while (parentId) {
            const parent = await User.findOne({ memberId: parentId });
            if (!parent) break;

            // Update parent's team counters
            if (currentPosition === 'left') {
                parent.leftTeamInactive = Math.max(0, parent.leftTeamInactive - 1);
                parent.leftTeamActive += 1;
            } else if (currentPosition === 'right') {
                parent.rightTeamInactive = Math.max(0, parent.rightTeamInactive - 1);
                parent.rightTeamActive += 1;
            }
            await parent.save();

            // Move up
            currentPosition = parent.position;
            parentId = parent.parentId;
        }
    },

    /**
     * Update Team Counts Up the Tree (Recursive / Iterative)
     * Increments `leftTeamCount` or `rightTeamCount` for all ancestors.
     * Also updates Active/Inactive counts based on new user status (usually inactive on join).
     */
    updateTeamCountsUpTree: async (userId, status = 'inactive') => {
        let current = await User.findById(userId);
        if (!current) return;

        let parentMemberId = current.parentId;
        let currentPosition = current.position;

        while (parentMemberId) {
            const parent = await User.findOne({ memberId: parentMemberId });
            if (!parent) break;

            if (currentPosition === 'left') {
                parent.leftTeamCount += 1;
                if (status === 'active') parent.leftTeamActive += 1;
                else parent.leftTeamInactive += 1;
            } else if (currentPosition === 'right') {
                parent.rightTeamCount += 1;
                if (status === 'active') parent.rightTeamActive += 1;
                else parent.rightTeamInactive += 1;
            }

            await parent.save();

            currentPosition = parent.position;
            parentMemberId = parent.parentId;
        }
    },

    /**
     * Get Genealogy Tree (Optimized)
     * Uses $graphLookup for visual nodes and stored fields for counts.
     */
    getGenealogyTree: async (userId, depth = 3) => {
        const rootUser = await User.findById(userId).lean(); // Use lean for performance
        if (!rootUser) return null;

        // Fetch descendants up to specified depth using aggregation
        const treeData = await User.aggregate([
            { $match: { _id: rootUser._id } },
            {
                $graphLookup: {
                    from: 'users',
                    startWith: '$memberId', // Correct: Start with MemberID (String)
                    connectFromField: 'memberId', // Correct: Use MemberID to find next level
                    connectToField: 'parentId',   // Correct: Match against ParentIDString
                    as: 'descendants',
                    maxDepth: depth - 1,
                    depthField: 'level'
                }
            }
        ]);

        if (!treeData || treeData.length === 0) return null;

        const rootNode = treeData[0];
        const descendants = rootNode.descendants || [];

        // Helper to find checking finance for stars (bulk fetch)
        const allUserIds = [rootNode._id, ...descendants.map(d => d._id)];
        const finances = await UserFinance.find({ user: { $in: allUserIds } }).select('user isStar leftLegBV rightLegBV isolatedRank').lean();
        const financeMap = new Map();
        finances.forEach(f => financeMap.set(f.user.toString(), f));

        // Recursive function to reconstruct tree from flat list
        const buildNode = (user, currentLevel) => {
            if (currentLevel > depth) return null;

            const finance = financeMap.get(user._id.toString());

            // Use stored counts!
            const leftTeamCount = user.leftTeamCount || 0;
            const rightTeamCount = user.rightTeamCount || 0;

            const isolatedRank = finance?.isolatedRank || 'Associate';
            let rankColor = '#95a5a6'; // Default Associate (Grey)
            switch (isolatedRank) {
                case 'Bronze': rankColor = '#cd7f32'; break;
                case 'Silver': rankColor = '#bdc3c7'; break;
                case 'Gold': rankColor = '#f1c40f'; break;
                case 'Platinum': rankColor = '#e5e4e2'; break;
                case 'Diamond': rankColor = '#00d2d3'; break;
                case 'Ruby': rankColor = '#e74c3c'; break;
                case 'Sapphire': rankColor = '#0984e3'; break;
                case 'Emerald': rankColor = '#2ecc71'; break;
                case 'Crown': rankColor = '#9b59b6'; break;
                case 'Elite': rankColor = '#34495e'; break;
                case 'Royal': rankColor = '#c0392b'; break;
                case 'Legend': rankColor = '#f39c12'; break;
                case 'SSVPL Legend': rankColor = '#000000'; break;
                case 'SSVPL Master': rankColor = '#b8860b'; break;
            }

            const node = {
                memberId: user.memberId,
                fullName: user.fullName,
                rank: isolatedRank, // REPLACED currentRank WITH isolatedRank
                rankColor: rankColor,
                isStar: finance?.isStar || false,
                position: user.position || 'root',
                profileImage: user.profilePicture?.url || null,
                sponsorId: user.sponsorId,
                joiningDate: user.createdAt,
                status: user.status,

                // Total Team Stats (Active + Inactive Breakdown)
                leftDirectActive: user.leftTeamActive || 0,
                leftDirectInactive: user.leftTeamInactive || 0,
                rightDirectActive: user.rightTeamActive || 0,
                rightDirectInactive: user.rightTeamInactive || 0,

                // Legacy Total Counts (kept for reference)
                leftTeamCount: leftTeamCount,
                rightTeamCount: rightTeamCount,

                // Retaining BV info
                leftLegBV: finance?.leftLegBV || 0,
                rightLegBV: finance?.rightLegBV || 0,

                // Stars need to be counted? 
                // If we didn't store "leftLegStars", we can't easily deliver it without recursion.
                // For this optimization, we will set them to 0 or null unless specific calculation is requested.
                // Or we can approximate from the fetched visual tree (limited accuracy).
                leftLegStars: 0, // Pending optimization: add 'leftLegStars' to User/UserFinance model
                rightLegStars: 0,

                children: [] // Optional: Flat array or left/right props
            };

            // Find children in descendants array
            if (currentLevel < depth) {
                // Find Left Child
                // We have user.leftChild (ObjectId).
                // Find in descendants
                if (user.leftChild) {
                    const leftChildDetails = descendants.find(d => d._id.toString() === user.leftChild.toString());
                    if (leftChildDetails) {
                        node.left = buildNode(leftChildDetails, currentLevel + 1);
                    }
                }

                if (user.rightChild) {
                    const rightChildDetails = descendants.find(d => d._id.toString() === user.rightChild.toString());
                    if (rightChildDetails) {
                        node.right = buildNode(rightChildDetails, currentLevel + 1);
                    }
                }
            }

            return node;
        };

        return buildNode(rootNode, 1);
    },

    /**
     * Get Complete Team for a Leg (Left/Right) with Pagination and Optimization
     * Uses $graphLookup to fetch valid descendants efficiently
     */
    getCompleteLegTeam: async (userId, leg, page = 1, limit = 10) => {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        let startNodeId = null;
        if (leg === 'left') startNodeId = user.leftChild;
        else if (leg === 'right') startNodeId = user.rightChild;

        if (!startNodeId) {
            return {
                members: [],
                pagination: { total: 0, page, limit, pages: 0 }
            };
        }

        const startNode = await User.findById(startNodeId);
        if (!startNode) {
            return {
                members: [],
                pagination: { total: 0, page, limit, pages: 0 }
            };
        }

        // Use $graphLookup to find ALL descendants of the startNode
        const data = await User.aggregate([
            { $match: { _id: startNode._id } },
            {
                $graphLookup: {
                    from: 'users',
                    startWith: '$memberId', // Start with MemberID string
                    connectFromField: 'memberId',
                    connectToField: 'parentId',
                    as: 'descendants',
                    depthField: 'depth'
                }
            },
            {
                $project: {
                    allDescendants: {
                        $concatArrays: [["$$ROOT"], "$descendants"]
                    }
                }
            },
            { $unwind: "$allDescendants" },
            { $replaceRoot: { newRoot: "$allDescendants" } },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: (page - 1) * limit }, { $limit: limit }]
                }
            }
        ]);

        if (!data || data.length === 0) {
            return {
                members: [],
                pagination: { total: 0, page, limit, pages: 0 }
            };
        }

        const result = data[0];
        const total = result.metadata[0] ? result.metadata[0].total : 0;

        // Map raw aggregation result to cleaner object
        const members = result.data.map(m => ({
            memberId: m.memberId,
            fullName: m.fullName,
            rank: m.currentRank,
            joiningDate: m.createdAt,
            status: m.status,
            sponsorId: m.sponsorId,
            profilePicture: m.profilePicture?.url || null
        }));

        return {
            members,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    },
};
