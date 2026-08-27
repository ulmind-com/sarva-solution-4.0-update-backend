import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

/**
 * FIX: 3 nodes missed by migration due to safety limit.
 * All have exactly -52 difference (the subtree size).
 */
async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to DB\n");

        const User = mongoose.connection.db.collection('users');

        // Fix 1: SVS000001 (ADMIN) — rightTeam is 52 too high
        await User.updateOne(
            { memberId: 'SVS000001' },
            { $inc: { rightTeamCount: -52, rightTeamActive: -38, rightTeamInactive: -14 } }
        );
        console.log("✅ SVS000001 (ADMIN): rightTeam -= 52");

        // Fix 2: SVS14031714 — leftTeam is 52 too high
        await User.updateOne(
            { memberId: 'SVS14031714' },
            { $inc: { leftTeamCount: -52, leftTeamActive: -38, leftTeamInactive: -14 } }
        );
        console.log("✅ SVS14031714: leftTeam -= 52");

        // Fix 3: SVS27450188 — rightTeam is 52 too high
        await User.updateOne(
            { memberId: 'SVS27450188' },
            { $inc: { rightTeamCount: -52, rightTeamActive: -38, rightTeamInactive: -14 } }
        );
        console.log("✅ SVS27450188: rightTeam -= 52");

        console.log("\n🎉 All 3 nodes fixed!");

    } catch(err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}
fix();
