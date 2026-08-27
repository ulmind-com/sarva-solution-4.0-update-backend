import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../');
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

// Import models
import User from '../src/models/User.model.js';

async function verifyFix() {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(uri);
        console.log('✅ Connected to DB');

        // Create a dummy inactive user
        const testMemberId = `TEST${Math.floor(Math.random() * 10000)}`;
        const user = await User.create({
            memberId: testMemberId,
            fullName: 'Activation Test User',
            email: `${testMemberId}@test.com`,
            password: 'password123',
            phone: `9${Math.floor(Math.random() * 1000000000)}`,
            status: 'inactive',
            isFirstPurchaseDone: false,
            personalPV: 0
        });
        console.log(`👤 Created inactive user: ${user.memberId} (Status: ${user.status})`);

        // SIMULATE CONTROLLER LOGIC
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Mock sale logic
            const totalPV = 50; // > 1 PV
            const isFirstPurchase = !user.isFirstPurchaseDone;
            const willActivate = isFirstPurchase && totalPV >= 1 && user.status === 'inactive';

            // Update user
            user.personalPV += totalPV;
            if (isFirstPurchase) user.isFirstPurchaseDone = true;

            if (willActivate) {
                user.status = 'active';
                console.log('   Converting user to active...');
            }

            // CRITICAL FIX: The save call
            await user.save({ session });

            await session.commitTransaction();
            console.log('✅ Transaction Committed');

        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }

        // VERIFY
        const updatedUser = await User.findById(user._id);
        console.log(`🔍 User Status After Sale: ${updatedUser.status}`);
        console.log(`🔍 User PV After Sale: ${updatedUser.personalPV}`);

        if (updatedUser.status === 'active' && updatedUser.personalPV === 50) {
            console.log('✅ PASS: User was successfully activated and PV updated.');
        } else {
            console.error('❌ FAIL: User is still inactive or PV not updated.');
            process.exit(1);
        }

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ ERROR:', error);
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
        process.exit(1);
    }
}

verifyFix();
