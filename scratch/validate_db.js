import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function fullDatabaseAudit() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to DB\n");

        const User = mongoose.connection.db.collection('users');

        // ==========================================
        // STEP 1: Load ALL users into memory
        // ==========================================
        console.log("Loading all users...");
        const allUsers = await User.find({}).toArray();
        console.log("Total users in DB: " + allUsers.length + "\n");

        // Build lookup maps
        const byId = new Map();       // ObjectId string → user
        const byMemberId = new Map(); // memberId → user
        for (const u of allUsers) {
            byId.set(String(u._id), u);
            byMemberId.set(u.memberId, u);
        }

        let totalIssues = 0;
        const issueList = [];

        // ==========================================
        // CHECK 1: Parent-Child Consistency
        // ==========================================
        console.log("=== CHECK 1: Parent-Child Link Consistency ===");
        let parentChildOk = 0, parentChildFail = 0;

        for (const u of allUsers) {
            if (!u.parentId) continue; // Root node

            const parent = byMemberId.get(u.parentId);
            if (!parent) {
                parentChildFail++;
                issueList.push(`❌ ${u.memberId} (${u.fullName}): parent ${u.parentId} NOT FOUND in DB`);
                continue;
            }

            // Check that parent knows about this child
            const isLeftChild = parent.leftChild && String(parent.leftChild) === String(u._id);
            const isRightChild = parent.rightChild && String(parent.rightChild) === String(u._id);

            if (!isLeftChild && !isRightChild) {
                // Not a direct child - could be deeper in tree, which is OK if parentId is used as "placement parent"
                // But in this system, parentId = direct binary parent
                parentChildFail++;
                issueList.push(`❌ ${u.memberId} (${u.fullName}): claims parentId=${u.parentId} but NOT found as leftChild or rightChild of parent`);
            } else {
                // Verify position field matches
                if (isLeftChild && u.position !== 'left') {
                    parentChildFail++;
                    issueList.push(`⚠️ ${u.memberId}: is leftChild but position='${u.position}'`);
                } else if (isRightChild && u.position !== 'right') {
                    parentChildFail++;
                    issueList.push(`⚠️ ${u.memberId}: is rightChild but position='${u.position}'`);
                } else {
                    parentChildOk++;
                }
            }
        }
        console.log(`✅ Consistent: ${parentChildOk} | ❌ Issues: ${parentChildFail}\n`);
        totalIssues += parentChildFail;

        // ==========================================
        // CHECK 2: Team Count Accuracy (ALL users)
        // ==========================================
        console.log("=== CHECK 2: Team Count Accuracy (every user) ===");
        
        // Recursive count function using in-memory data
        function countDescendants(userId) {
            if (!userId) return { total: 0, active: 0, inactive: 0 };
            const user = byId.get(String(userId));
            if (!user) return { total: 0, active: 0, inactive: 0 };

            let total = 1;
            let active = user.status === 'active' ? 1 : 0;
            let inactive = user.status !== 'active' ? 1 : 0;

            if (user.leftChild) {
                const lc = countDescendants(user.leftChild);
                total += lc.total; active += lc.active; inactive += lc.inactive;
            }
            if (user.rightChild) {
                const rc = countDescendants(user.rightChild);
                total += rc.total; active += rc.active; inactive += rc.inactive;
            }
            return { total, active, inactive };
        }

        let teamCountOk = 0, teamCountFail = 0;
        const teamCountIssues = [];

        for (const u of allUsers) {
            const leftActual = u.leftChild ? countDescendants(u.leftChild) : { total: 0, active: 0, inactive: 0 };
            const rightActual = u.rightChild ? countDescendants(u.rightChild) : { total: 0, active: 0, inactive: 0 };

            const storedLeft = u.leftTeamCount || 0;
            const storedRight = u.rightTeamCount || 0;

            if (storedLeft !== leftActual.total || storedRight !== rightActual.total) {
                teamCountFail++;
                teamCountIssues.push({
                    memberId: u.memberId,
                    name: u.fullName,
                    storedLeft, actualLeft: leftActual.total,
                    storedRight, actualRight: rightActual.total,
                    diffLeft: leftActual.total - storedLeft,
                    diffRight: rightActual.total - storedRight
                });
            } else {
                teamCountOk++;
            }
        }

        console.log(`✅ Correct: ${teamCountOk} | ❌ Mismatched: ${teamCountFail}`);
        if (teamCountIssues.length > 0) {
            console.log("\nMismatched users:");
            for (const t of teamCountIssues) {
                console.log(`  ${t.memberId} (${t.name}): stored L=${t.storedLeft} R=${t.storedRight} | actual L=${t.actualLeft} R=${t.actualRight} | diff L=${t.diffLeft > 0 ? '+' : ''}${t.diffLeft} R=${t.diffRight > 0 ? '+' : ''}${t.diffRight}`);
            }
        }
        totalIssues += teamCountFail;
        console.log("");

        // ==========================================
        // CHECK 3: Orphan Nodes (leftChild/rightChild pointing to non-existent users)
        // ==========================================
        console.log("=== CHECK 3: Orphan/Broken References ===");
        let brokenRefs = 0;
        for (const u of allUsers) {
            if (u.leftChild && !byId.has(String(u.leftChild))) {
                brokenRefs++;
                issueList.push(`❌ ${u.memberId}: leftChild ${u.leftChild} NOT FOUND in DB`);
            }
            if (u.rightChild && !byId.has(String(u.rightChild))) {
                brokenRefs++;
                issueList.push(`❌ ${u.memberId}: rightChild ${u.rightChild} NOT FOUND in DB`);
            }
        }
        console.log(brokenRefs === 0 ? "✅ No broken references found" : `❌ ${brokenRefs} broken references found`);
        totalIssues += brokenRefs;
        console.log("");

        // ==========================================
        // CHECK 4: Duplicate Children
        // ==========================================
        console.log("=== CHECK 4: Duplicate Children Check ===");
        const childSet = new Set();
        let duplicates = 0;
        for (const u of allUsers) {
            if (u.leftChild) {
                const key = String(u.leftChild);
                if (childSet.has(key)) {
                    duplicates++;
                    issueList.push(`❌ ${u.memberId}: leftChild ${key} is claimed by multiple parents`);
                }
                childSet.add(key);
            }
            if (u.rightChild) {
                const key = String(u.rightChild);
                if (childSet.has(key)) {
                    duplicates++;
                    issueList.push(`❌ ${u.memberId}: rightChild ${key} is claimed by multiple parents`);
                }
                childSet.add(key);
            }
        }
        console.log(duplicates === 0 ? "✅ No duplicate children found" : `❌ ${duplicates} duplicate children found`);
        totalIssues += duplicates;
        console.log("");

        // ==========================================
        // CHECK 5: Debasis Migration Verification
        // ==========================================
        console.log("=== CHECK 5: Debasis Migration Status ===");
        const debasis = byMemberId.get('SVS11443849');
        const anis = byMemberId.get('SVS10511340');
        const uniqueTraders = byMemberId.get('SVS40986691');

        if (debasis) {
            console.log("Debasis parentId: " + debasis.parentId + (debasis.parentId === 'SVS10511340' ? " ✅ (Anis)" : " ❌"));
            console.log("Debasis sponsorId: " + debasis.sponsorId + (debasis.sponsorId === 'SVS10511340' ? " ✅ (Anis)" : " ❌"));
            console.log("Debasis position: " + debasis.position + (debasis.position === 'left' ? " ✅" : " ❌"));
        }
        if (anis) {
            console.log("Anis leftChild: " + (anis.leftChild ? String(anis.leftChild) === String(debasis._id) ? "✅ (Debasis)" : "❌ Wrong" : "❌ null"));
            console.log("Anis leftTeamCount: " + anis.leftTeamCount);
        }
        if (uniqueTraders) {
            console.log("Unique Traders leftChild: " + (uniqueTraders.leftChild === null ? "✅ null (removed)" : "❌ " + uniqueTraders.leftChild));
            console.log("Unique Traders leftTeamCount: " + uniqueTraders.leftTeamCount);
        }
        console.log("");

        // ==========================================
        // FINAL REPORT
        // ==========================================
        console.log("=".repeat(60));
        if (totalIssues === 0) {
            console.log("🎉 FULL DATABASE AUDIT PASSED — ALL " + allUsers.length + " USERS CONSISTENT!");
        } else {
            console.log("⚠️ TOTAL ISSUES FOUND: " + totalIssues);
            if (issueList.length > 0) {
                console.log("\nDetailed issues:");
                issueList.forEach(i => console.log("  " + i));
            }
        }
        console.log("=".repeat(60));

    } catch(err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}
fullDatabaseAudit();
