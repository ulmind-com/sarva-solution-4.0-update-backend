import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

console.log('Starting Super Admin setup...\n');

const setup = async () => {
    let conn;
    try {
        // Quick connection
        conn = await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });
        console.log('✅ Connected to MongoDB\n');

        // Check existing
        let admin = await User.findOne({ memberId: 'SVS000001' });

        if (admin) {
            console.log('📋 Super Admin found. Updating password...');
            const hash = await bcrypt.hash('abc123', 12);
            admin.password = hash;
            admin.status = 'active';
            admin.role = 'admin';
            admin.leftDirectActive = 1;
            admin.rightDirectActive = 1;
            if (!admin.kyc) admin.kyc = {};
            admin.kyc.status = 'verified';
            await admin.save();
            console.log('✅ Password updated!');
        } else {
            console.log('📋 Creating new Super Admin...');
            const hash = await bcrypt.hash('abc123', 12);
            admin = await User.create({
                username: 'rootadmin',
                email: 'admin@sarvasolution.com',
                password: hash,
                fullName: 'Super Admin',
                phone: '0000000000',
                memberId: 'SVS000001',
                sponsorId: null,
                parentId: null,
                position: 'root',
                sponsorLeg: 'none',
                leftDirectActive: 1,
                rightDirectActive: 1,
                kyc: { status: 'verified' },
                role: 'admin',
                status: 'active'
            });
            console.log('✅ Super Admin created!');

            // Create finance
            const existing = await UserFinance.findOne({ user: admin._id });
            if (!existing) {
                await UserFinance.create({
                    user: admin._id,
                    memberId: 'SVS000001',
                    currentRank: 'Associate',
                    isStar: false
                });
                console.log('✅ Finance record created!');
            }
        }

        console.log('\n=== LOGIN CREDENTIALS ===');
        console.log('Member ID: SVS000001');
        console.log('Password: abc123');
        console.log('Email:', admin.email);
        console.log('========================\n');

        await mongoose.connection.close();
        process.exit(0);
    } catch (e) {
        console.error('\n❌ Error:', e.message);
        if (conn) await mongoose.connection.close();
        process.exit(1);
    }
};

setup();
