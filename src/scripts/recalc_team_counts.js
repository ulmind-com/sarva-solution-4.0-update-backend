
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Configs from '../config/config.js';
import User from '../models/User.model.js';
import chalk from 'chalk';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(Configs.MONGO_URI);
        console.log(chalk.green('MongoDB Connected'));
    } catch (error) {
        console.error(chalk.red('MongoDB Connection Failed:'), error);
        process.exit(1);
    }
};

const recalcTeamCounts = async () => {
    await connectDB();

    console.log(chalk.blue('Starting Team Count Recalculation...'));

    try {
        // Fetch all users
        const users = await User.find({}).select('_id memberId leftChild rightChild');
        const userMap = new Map();

        users.forEach(u => {
            userMap.set(u._id.toString(), {
                _id: u._id,
                memberId: u.memberId,
                leftChild: u.leftChild ? u.leftChild.toString() : null,
                rightChild: u.rightChild ? u.rightChild.toString() : null,
                leftTeamCount: 0,
                rightTeamCount: 0
            });
        });

        console.log(chalk.blue(`Loaded ${users.length} users into memory.`));

        // Recursive function to get total count
        // Returns total count of subtree
        const getSubtreeCount = (userId) => {
            if (!userId) return 0;
            const node = userMap.get(userId);
            if (!node) return 0;

            // Prevent infinite loops if circular reference exists (should not happen in tree)
            // But for safety, we could track visited in recursion stack. 
            // Assuming strict tree structure for now.

            const leftCount = getSubtreeCount(node.leftChild);
            const rightCount = getSubtreeCount(node.rightChild);

            node.leftTeamCount = leftCount;
            node.rightTeamCount = rightCount;

            // Total descendants = left + right + 1 (self) is for parent's count
            // Return total descendants + 1 (self)
            return leftCount + rightCount + 1;
        };

        // We need to find root nodes or just iterate everyone? 
        // If we iterate everyone and call getSubtreeCount, memoization would be needed to be efficient.
        // Actually, `getSubtreeCount` computes for children first.
        // So if we memoize, we save time.
        // However, setting the counts on the `node` object in map effectively memoizes it 
        // IF we process bottom-up.

        // Simple recursion with memoization (via the map actually) 
        // But wait, the map stores the RESULT `leftTeamCount`.
        // We need to know if we already computed it.
        // Let's add a `computed` flag.

        const visited = new Set();

        const computeForNode = (userId) => {
            if (!userId) return 0;
            if (visited.has(userId)) {
                const node = userMap.get(userId);
                // If already visited, return total count (left + right + 1)
                return (node.leftTeamCount || 0) + (node.rightTeamCount || 0) + 1;
            }

            const node = userMap.get(userId);
            if (!node) return 0;

            visited.add(userId);

            const leftCount = computeForNode(node.leftChild);
            const rightCount = computeForNode(node.rightChild);

            node.leftTeamCount = leftCount;
            node.rightTeamCount = rightCount;

            return leftCount + rightCount + 1;
        };

        // Iterate all users to ensure disjoint trees are covered
        for (const userId of userMap.keys()) {
            if (!visited.has(userId)) {
                computeForNode(userId);
            }
        }

        console.log(chalk.blue('Calculations complete. Updating database...'));

        let updatedCount = 0;
        // Batch update
        const bulkOps = [];
        for (const node of userMap.values()) {
            bulkOps.push({
                updateOne: {
                    filter: { _id: node._id },
                    update: {
                        $set: {
                            leftTeamCount: node.leftTeamCount,
                            rightTeamCount: node.rightTeamCount
                        }
                    }
                }
            });

            if (bulkOps.length >= 1000) {
                await User.bulkWrite(bulkOps);
                updatedCount += bulkOps.length;
                console.log(`Updated ${updatedCount} users...`);
                bulkOps.length = 0;
            }
        }

        if (bulkOps.length > 0) {
            await User.bulkWrite(bulkOps);
            updatedCount += bulkOps.length;
        }

        console.log(chalk.green(`Successfully updated team counts for ${updatedCount} users.`));
        process.exit(0);

    } catch (error) {
        console.error(chalk.red('Error calculating team counts:'), error);
        process.exit(1);
    }
};

recalcTeamCounts();
