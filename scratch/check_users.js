import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB\n");

        const User = mongoose.connection.db.collection('users');

        const debasis = await User.findOne({ memberId: 'SVS11443849' });
        const anis = await User.findOne({ memberId: 'SVS10511340' });

        // 1. Old Sponsor (SVS55735991)
        console.log("=== DEBASIS's CURRENT SPONSOR (SVS55735991) ===");
        const oldSponsor = await User.findOne({ memberId: 'SVS55735991' });
        if (oldSponsor) {
            console.log("Name:", oldSponsor.fullName);
            console.log("MemberId:", oldSponsor.memberId);
            console.log("DirectSponsors Count:", oldSponsor.directSponsors?.count);
            console.log("LeftDirectActive:", oldSponsor.leftDirectActive);
            console.log("LeftDirectInactive:", oldSponsor.leftDirectInactive);
            console.log("RightDirectActive:", oldSponsor.rightDirectActive);
            console.log("RightDirectInactive:", oldSponsor.rightDirectInactive);
        }

        // 2. Find Debasis's sponsorLeg on old sponsor
        console.log("\nDebasis's sponsorLeg:", debasis.sponsorLeg);

        // 3. Count active/inactive in Debasis's subtree recursively
        console.log("\n=== DEBASIS's SUBTREE BREAKDOWN ===");
        let activeCount = 0;
        let inactiveCount = 0;

        async function countSubtree(userId) {
            if (!userId) return;
            const user = await User.findOne({ _id: userId });
            if (!user) return;
            
            if (user.status === 'active') activeCount++;
            else inactiveCount++;

            if (user.leftChild) await countSubtree(user.leftChild);
            if (user.rightChild) await countSubtree(user.rightChild);
        }

        // Count Debasis himself
        if (debasis.status === 'active') activeCount++;
        else inactiveCount++;
        // Count his subtree
        if (debasis.leftChild) await countSubtree(debasis.leftChild);
        if (debasis.rightChild) await countSubtree(debasis.rightChild);
        
        const totalSubtree = activeCount + inactiveCount;
        console.log("Active (including Debasis):", activeCount);
        console.log("Inactive:", inactiveCount);
        console.log("TOTAL:", totalSubtree);

        // 4. Trace OLD upline chain (from Unique Traders to root)
        console.log("\n=== OLD UPLINE CHAIN (Unique Traders → Root) ===");
        let current = await User.findOne({ memberId: 'SVS40986691' }); // Unique Traders
        let step = 0;
        while (current) {
            step++;
            const childBelow = step === 1 ? debasis : await User.findOne({ parentId: current.parentId, _id: current._id });
            console.log(`${step}. ${current.fullName} (${current.memberId}) | position: ${current.position} | leftTeam: ${current.leftTeamCount} | rightTeam: ${current.rightTeamCount}`);
            
            if (!current.parentId || step > 20) break;
            current = await User.findOne({ memberId: current.parentId });
        }

        // 5. Trace NEW upline chain (from Anis to root)
        console.log("\n=== NEW UPLINE CHAIN (Anis → Root) ===");
        current = anis;
        step = 0;
        while (current) {
            step++;
            console.log(`${step}. ${current.fullName} (${current.memberId}) | position: ${current.position} | leftTeam: ${current.leftTeamCount} | rightTeam: ${current.rightTeamCount}`);
            
            if (!current.parentId || step > 20) break;
            current = await User.findOne({ memberId: current.parentId });
        }

    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
