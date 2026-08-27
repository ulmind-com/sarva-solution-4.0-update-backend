import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/models/User.model.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const checkAndReset = async () => {
    try {
        console.log('Connecting...');
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
        console.log('Connected!\n');

        // Check if Super Admin exists
        const admin = await User.findOne({ memberId: 'SVS000001' });

        if (admin) {
            console.log('✅ Super Admin EXISTS');
            console.log(`   Email: ${admin.email}`);
            console.log(`   Status: ${admin.status}`);
            console.log(`   Role: ${admin.role}`);

            // Reset password
            console.log('\n🔄 Resetting password to "abc123"...');
            const hashedPassword = await bcrypt.hash('abc123', 12);
            admin.password = hashedPassword;
            await admin.save();

            console.log('✅ Password reset successful!');
            console.log('\n--- LOGIN CREDENTIALS ---');
            console.log('Email: admin@sarvasolution.com');
            console.log('Password: abc123');
            console.log('-------------------------\n');
        } else {
            console.log('❌ Super Admin NOT FOUND');
            console.log('Run: node scripts/create_super_admin_v2.js');
        }

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
};

checkAndReset();
