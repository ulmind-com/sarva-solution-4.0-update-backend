import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

/**
 * MIGRATION: Move Debasis Dutta (SVS11443849) + entire subtree
 * FROM: Unique Traders (SVS40986691) LEFT
 * TO:   Anis Rahaman Mallick (SVS10511340) LEFT
 * 
 * Subtree: 52 users (38 active, 14 inactive)
 */

const DEBASIS_ID = 'SVS11443849';
const ANIS_ID = 'SVS10511340';
const OLD_PARENT_ID = 'SVS40986691';  // Unique Traders
const OLD_SPONSOR_ID = 'SVS55735991'; // Momita Begum

const SUBTREE_TOTAL = 52;
const SUBTREE_ACTIVE = 38;
const SUBTREE_INACTIVE = 14;

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to DB\n");

        const User = mongoose.connection.db.collection('users');

        // ==========================================
        // STEP 0: VERIFY PRECONDITIONS
        // ==========================================
        console.log("=== STEP 0: VERIFYING PRECONDITIONS ===");

        const debasis = await User.findOne({ memberId: DEBASIS_ID });
        const anis = await User.findOne({ memberId: ANIS_ID });
        const oldParent = await User.findOne({ memberId: OLD_PARENT_ID });
        const oldSponsor = await User.findOne({ memberId: OLD_SPONSOR_ID });

        if (!debasis) throw new Error("Debasis NOT FOUND!");
        if (!anis) throw new Error("Anis NOT FOUND!");
        if (!oldParent) throw new Error("Old Parent (Unique Traders) NOT FOUND!");
        if (!oldSponsor) throw new Error("Old Sponsor (Momita) NOT FOUND!");

        if (anis.leftChild !== null) throw new Error("Anis's LEFT is NOT empty! ABORTING.");
        if (debasis.parentId !== OLD_PARENT_ID) throw new Error("Debasis's parentId mismatch! Expected " + OLD_PARENT_ID);
        if (String(oldParent.leftChild) !== String(debasis._id)) throw new Error("Debasis is NOT old parent's leftChild!");

        console.log("✅ All preconditions verified!\n");

        // ==========================================
        // STEP 1: STRUCTURAL CHANGES
        // ==========================================
        console.log("=== STEP 1: STRUCTURAL CHANGES ===");

        // 1a. Remove Debasis from old parent (Unique Traders)
        await User.updateOne(
            { memberId: OLD_PARENT_ID },
            { $set: { leftChild: null } }
        );
        console.log("✅ Unique Traders (SVS40986691): leftChild → null");

        // 1b. Update Debasis's parent/sponsor to Anis
        await User.updateOne(
            { memberId: DEBASIS_ID },
            { $set: { 
                parentId: ANIS_ID, 
                sponsorId: ANIS_ID, 
                position: 'left',
                sponsorLeg: 'left'
            }}
        );
        console.log("✅ Debasis: parentId → " + ANIS_ID + ", sponsorId → " + ANIS_ID + ", position → left");

        // 1c. Set Debasis as Anis's leftChild
        await User.updateOne(
            { memberId: ANIS_ID },
            { $set: { leftChild: debasis._id } }
        );
        console.log("✅ Anis: leftChild → " + debasis._id + "\n");

        // ==========================================
        // STEP 2: DIRECT SPONSOR UPDATES
        // ==========================================
        console.log("=== STEP 2: DIRECT SPONSOR UPDATES ===");

        // 2a. Old Sponsor (Momita): remove Debasis from direct count
        await User.updateOne(
            { memberId: OLD_SPONSOR_ID },
            { $inc: { 
                'directSponsors.count': -1,
                leftDirectActive: -1
            }}
        );
        console.log("✅ Old Sponsor (Momita): directSponsors.count -= 1, leftDirectActive -= 1");

        // 2b. New Sponsor (Anis): add Debasis to direct count
        await User.updateOne(
            { memberId: ANIS_ID },
            { $inc: { 
                'directSponsors.count': 1,
                leftDirectActive: 1
            }}
        );
        console.log("✅ New Sponsor (Anis): directSponsors.count += 1, leftDirectActive += 1\n");

        // ==========================================
        // STEP 3: DECREASE TEAM COUNTS — OLD UPLINE CHAIN
        // ==========================================
        console.log("=== STEP 3: DECREASE OLD UPLINE CHAIN ===");

        // Start from Unique Traders (old parent), go UP
        // First: Unique Traders itself — Debasis was on LEFT
        await User.updateOne(
            { memberId: OLD_PARENT_ID },
            { $inc: { 
                leftTeamCount: -SUBTREE_TOTAL,
                leftTeamActive: -SUBTREE_ACTIVE,
                leftTeamInactive: -SUBTREE_INACTIVE
            }}
        );
        console.log("1. Unique Traders (SVS40986691): leftTeam -= " + SUBTREE_TOTAL);

        // Now traverse UP from Unique Traders
        let current = await User.findOne({ memberId: OLD_PARENT_ID });
        let step = 1;
        while (current && current.parentId) {
            step++;
            const parent = await User.findOne({ memberId: current.parentId });
            if (!parent) break;

            const side = current.position; // 'left' or 'right'
            if (side === 'left') {
                await User.updateOne(
                    { memberId: parent.memberId },
                    { $inc: { 
                        leftTeamCount: -SUBTREE_TOTAL,
                        leftTeamActive: -SUBTREE_ACTIVE,
                        leftTeamInactive: -SUBTREE_INACTIVE
                    }}
                );
                console.log(`${step}. ${parent.fullName} (${parent.memberId}): leftTeam -= ${SUBTREE_TOTAL}`);
            } else if (side === 'right') {
                await User.updateOne(
                    { memberId: parent.memberId },
                    { $inc: { 
                        rightTeamCount: -SUBTREE_TOTAL,
                        rightTeamActive: -SUBTREE_ACTIVE,
                        rightTeamInactive: -SUBTREE_INACTIVE
                    }}
                );
                console.log(`${step}. ${parent.fullName} (${parent.memberId}): rightTeam -= ${SUBTREE_TOTAL}`);
            }

            current = parent;
            if (step > 50) { console.log("⚠️ Safety limit reached"); break; }
        }
        console.log("");

        // ==========================================
        // STEP 4: INCREASE TEAM COUNTS — NEW UPLINE CHAIN
        // ==========================================
        console.log("=== STEP 4: INCREASE NEW UPLINE CHAIN ===");

        // First: Anis itself — Debasis goes on LEFT
        await User.updateOne(
            { memberId: ANIS_ID },
            { $inc: { 
                leftTeamCount: SUBTREE_TOTAL,
                leftTeamActive: SUBTREE_ACTIVE,
                leftTeamInactive: SUBTREE_INACTIVE
            }}
        );
        console.log("1. Anis (SVS10511340): leftTeam += " + SUBTREE_TOTAL);

        // Now traverse UP from Anis
        current = await User.findOne({ memberId: ANIS_ID });
        step = 1;
        while (current && current.parentId) {
            step++;
            const parent = await User.findOne({ memberId: current.parentId });
            if (!parent) break;

            const side = current.position;
            if (side === 'left') {
                await User.updateOne(
                    { memberId: parent.memberId },
                    { $inc: { 
                        leftTeamCount: SUBTREE_TOTAL,
                        leftTeamActive: SUBTREE_ACTIVE,
                        leftTeamInactive: SUBTREE_INACTIVE
                    }}
                );
                console.log(`${step}. ${parent.fullName} (${parent.memberId}): leftTeam += ${SUBTREE_TOTAL}`);
            } else if (side === 'right') {
                await User.updateOne(
                    { memberId: parent.memberId },
                    { $inc: { 
                        rightTeamCount: SUBTREE_TOTAL,
                        rightTeamActive: SUBTREE_ACTIVE,
                        rightTeamInactive: SUBTREE_INACTIVE
                    }}
                );
                console.log(`${step}. ${parent.fullName} (${parent.memberId}): rightTeam += ${SUBTREE_TOTAL}`);
            }

            current = parent;
            if (step > 50) { console.log("⚠️ Safety limit reached"); break; }
        }

        console.log("\n🎉 === MIGRATION COMPLETE === 🎉");
        console.log("Debasis Dutta (SVS11443849) + 51 subtree members moved to Anis's LEFT.");

    } catch(err) {
        console.error("❌ MIGRATION ERROR:", err.message);
    } finally {
        await mongoose.disconnect();
        console.log("\nDisconnected from DB.");
    }
}

migrate();
