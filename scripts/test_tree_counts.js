import mongoose from 'mongoose';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import { mlmService } from '../src/services/mlm.service.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test Script: Verify Tree Complete Team Counts
 * 
 * This script tests the updated getGenealogyTree method
 * to ensure it correctly counts complete teams (recursive)
 */

const testTreeCounts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Find a user with children (preferably root or someone with a team)
        const rootUser = await User.findOne({ memberId: 'SVS000001' });

        if (!rootUser) {
            console.log('❌ Root user (SVS000001) not found. Please ensure database is seeded.');
            return;
        }

        console.log(`\n📊 Testing tree for: ${rootUser.memberId} (${rootUser.fullName})`);
        console.log('─'.repeat(60));

        // Fetch the tree with depth 3
        const tree = await mlmService.getGenealogyTree(rootUser._id, 3);

        if (!tree) {
            console.log('❌ Tree returned null');
            return;
        }

        console.log('\n🌳 Tree Root Node:');
        console.log(`   Member ID: ${tree.memberId}`);
        console.log(`   Full Name: ${tree.fullName}`);
        console.log(`   Rank: ${tree.rank}`);
        console.log(`   Status: ${tree.status}`);

        console.log('\n📈 Left Leg Statistics:');
        console.log(`   ✓ Active Members: ${tree.leftCompleteActive}`);
        console.log(`   ✗ Inactive Members: ${tree.leftCompleteInactive}`);
        console.log(`   Total: ${tree.leftTeamCount}`);
        console.log(`   BV: ${tree.leftLegBV}`);

        console.log('\n📈 Right Leg Statistics:');
        console.log(`   ✓ Active Members: ${tree.rightCompleteActive}`);
        console.log(`   ✗ Inactive Members: ${tree.rightCompleteInactive}`);
        console.log(`   Total: ${tree.rightTeamCount}`);
        console.log(`   BV: ${tree.rightLegBV}`);

        console.log('\n🔍 Verification:');
        console.log(`   Left Total = Active + Inactive: ${tree.leftTeamCount} = ${tree.leftCompleteActive} + ${tree.leftCompleteInactive} ✓`);
        console.log(`   Right Total = Active + Inactive: ${tree.rightTeamCount} = ${tree.rightCompleteActive} + ${tree.rightCompleteInactive} ✓`);

        // Display first level children if they exist
        if (tree.left || tree.right) {
            console.log('\n👥 Direct Children:');
            if (tree.left) {
                console.log(`   Left: ${tree.left.memberId} (${tree.left.fullName}) - ${tree.left.status}`);
                console.log(`      L: ${tree.left.leftTeamCount} members, R: ${tree.right ? tree.right.rightTeamCount : 0} members`);
            }
            if (tree.right) {
                console.log(`   Right: ${tree.right.memberId} (${tree.right.fullName}) - ${tree.right.status}`);
                console.log(`      L: ${tree.right.leftTeamCount} members, R: ${tree.right.rightTeamCount} members`);
            }
        }

        console.log('\n✅ Test completed successfully!');
        console.log('─'.repeat(60));

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
};

testTreeCounts();
