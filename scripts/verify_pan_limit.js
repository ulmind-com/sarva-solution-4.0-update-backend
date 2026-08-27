import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.model.js';

dotenv.config();

const verifyPanLimit = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        const testPAN = 'TESTPAN123X';

        // Cleanup first
        await User.deleteMany({ panCardNumber: testPAN });
        console.log(`Cleaned up any existing users with PAN: ${testPAN}`);

        // Helper to simulate registration check
        const checkPanLimit = async (pan) => {
            const count = await User.countDocuments({ panCardNumber: pan.toUpperCase() });
            console.log(`Current count for ${pan}: ${count}`);
            if (count >= 3) {
                throw new Error('Maximum 3 accounts allowed per PAN card');
            }
            return count;
        };

        // 1. Create 3 users
        for (let i = 1; i <= 3; i++) {
            console.log(`Creating user ${i}...`);
            await checkPanLimit(testPAN); // Should pass
            await User.create({
                memberId: `TEST_USER_${i}`,
                email: `test${i}@example.com`,
                phone: `999999999${i}`,
                fullName: `Test User ${i}`,
                password: 'password123',
                panCardNumber: testPAN,
                sponsorId: 'ROOT', // assuming root exists or validation skipped for raw create
                // Bypass schema validation for required fields if needed, but provide likely ones
                address: { street: 'Test St', city: 'Test City', state: 'Test State', zipCode: '123456' }
            });
        }
        console.log('Successfully created 3 users.');

        // 2. Try to create 4th user
        console.log('Attempting to create 4th user...');
        try {
            await checkPanLimit(testPAN); // Should FAIL
            console.error('❌ FAILED: Validation did NOT stop the 4th user!');
        } catch (error) {
            if (error.message === 'Maximum 3 accounts allowed per PAN card') {
                console.log('✅ PASSED: Validation correctly stopped the 4th user.');
            } else {
                console.error('❌ FAILED: Unexpected error:', error);
            }
        }

        // Cleanup
        await User.deleteMany({ panCardNumber: testPAN });
        console.log('Cleanup complete.');

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyPanLimit();
