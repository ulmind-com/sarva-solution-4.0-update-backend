import mongoose from 'mongoose';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import { mlmService } from '../src/services/mlm.service.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test: Verify Tree Star Counts
 */

const testStarCounts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database\n');

        // Find root user
        const rootUser = await User.findOne({ memberId: 'SVS000001' });

        if (!rootUser) {
            console.log('❌ Root user not found');
            return;
        }

        console.log(`🌳 Testing Star Counts for: ${rootUser.memberId}`);
        console.log('─'.repeat(60));

        // Fetch tree
        const tree = await mlmService.getGenealogyTree(rootUser._id, 2);

        if (!tree) {
            console.log('❌ Tree returned null');
            return;
        }

        console.log('\n📊 Tree Statistics:');
        console.log(`   Root: ${tree.memberId} (${tree.fullName})`);
        console.log(`   Rank: ${tree.rank}`);

        console.log('\n⭐ Left Leg:');
        console.log(`   Active Members: ${tree.leftCompleteActive}`);
        console.log(`   Inactive Members: ${tree.leftCompleteInactive}`);
        console.log(`   Total Members: ${tree.leftTeamCount}`);
        console.log(`   BV: ${tree.leftLegBV}`);
        console.log(`   ⭐ Total Stars: ${tree.leftLegStars}`);

        console.log('\n⭐ Right Leg:');
        console.log(`   Active Members: ${tree.rightCompleteActive}`);
        console.log(`   Inactive Members: ${tree.rightCompleteInactive}`);
        console.log(`   Total Members: ${tree.rightTeamCount}`);
        console.log(`   BV: ${tree.rightLegBV}`);
        console.log(`   ⭐ Total Stars: ${tree.rightLegStars}`);

        console.log('\n✅ Star counting test completed!');
        console.log('─'.repeat(60));

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
    }
};

testStarCounts();
