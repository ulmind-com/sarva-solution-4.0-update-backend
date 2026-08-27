import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import connectDB from '../config/db.js';

dotenv.config();

const migrateTeamCounts = async () => {
    try {
        await connectDB();
        console.log('DB Connected. Starting Migration...');

        // Fetch all users
        const users = await User.find({}).sort({ createdAt: -1 }); // Bottom-up processing might be efficient, but we need full tree traversal for accuracy.
        // Actually, easiest valid way is to traverse from each node down, OR traverse from leaf up?
        // Bottom-up: If I know my children's counts, I can sum them + children themselves.
        // Let's do Bottom-Up (reverse createdAt). 
        // Iterate users from newest to oldest.
        // For each user, calculate their own stats (0 if leaf), then ADD themselves to their Parent.

        // Wait, "ADD themselves to their Parent" allows us to build up the counts as we go up.
        // This is O(N) if we process correctly.

        console.log(`Found ${users.length} users. Resetting counts...`);

        // 1. Reset all counts to 0
        await User.updateMany({}, {
            leftTeamActive: 0,
            leftTeamInactive: 0,
            rightTeamActive: 0,
            rightTeamInactive: 0,
            leftTeamCount: 0,
            rightTeamCount: 0
        });

        console.log('Counts reset. Calculating...');

        // 2. Process Bottom-Up
        // We need to map children to parents.
        // Since we sort by createdAt desc, we likely hit children before parents.
        // But re-joining or different structures might vary.
        // Better approach:
        // Use a Map to store accumulated counts for each user ID.
        // Iterate all users, for each user, traverse UP the tree adding 1 to ancestors.
        // This is O(N * Depth), which is acceptable.

        let processed = 0;
        for (const user of users) {
            const isSelfActive = user.status === 'active';

            let current = user;
            let parentId = user.parentId;
            let currentPosition = user.position;

            while (parentId) {
                // We need to fetch parent to know where to go next
                const parent = await User.findOne({ memberId: parentId });
                if (!parent) break;

                // Update Parent's Counters in Memory (we will save later? No, save as we go or batch)
                // Saving every time is slow.
                // Better: Fetch all users into memory if < 10k?
                // Assuming < 10k for now.

                if (currentPosition === 'left') {
                    parent.leftTeamCount += 1;
                    if (isSelfActive) parent.leftTeamActive += 1;
                    else parent.leftTeamInactive += 1;
                } else if (currentPosition === 'right') {
                    parent.rightTeamCount += 1;
                    if (isSelfActive) parent.rightTeamActive += 1;
                    else parent.rightTeamInactive += 1;
                }

                await parent.save(); // Direct save for safety/simplicity

                currentPosition = parent.position;
                parentId = parent.parentId;
            }

            processed++;
            if (processed % 10 === 0) console.log(`Processed ${processed} users...`);
        }

        console.log('Migration Complete.');
        process.exit(0);

    } catch (error) {
        console.error('Migration Error:', error);
        process.exit(1);
    }
};

migrateTeamCounts();
