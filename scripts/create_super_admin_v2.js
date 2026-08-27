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

console.log('Starting Super Admin creation...');

const createSuperAdmin = async () => {
    try {
        console.log('Connecting to MongoDB...');
        if (!MONGO_URI) throw new Error('No MongoDB URI found');

        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000
        });
        console.log('Connected successfully!');

        // Delete existing if any
        await User.deleteOne({ memberId: 'SVS000001' });
        await UserFinance.deleteOne({ memberId: 'SVS000001' });
        console.log('Cleaned existing records');

        // Hash password
        const hashedPassword = await bcrypt.hash('abc123', 12);
        console.log('Password hashed');

        // Create Admin
        const admin = await User.create({
            username: 'rootadmin',
            email: 'admin@sarvasolution.com',
            password: hashedPassword,
            fullName: 'Super Admin',
            phone: '0000000000',
            memberId: 'SVS000001',
            sponsorId: null,
            parentId: null,
            position: 'root',
            sponsorLeg: 'none',
            leftDirectActive: 1,
            rightDirectActive: 1,
            personalPV: 0,
            leftLegPV: 0,
            rightLegPV: 0,
            kyc: { status: 'verified', verifiedAt: new Date() },
            role: 'admin',
            status: 'active'
        });

        console.log('✅ User created:', admin.memberId);

        // Create Finance
        const finance = await UserFinance.create({
            user: admin._id,
            memberId: 'SVS000001',
            wallet: { totalEarnings: 0, availableBalance: 0 },
            currentRank: 'Associate',
            isStar: false
        });

        console.log('✅ Finance created');
        console.log('\n=== SUCCESS ===');
        console.log('Member ID: SVS000001');
        console.log('Email: admin@sarvasolution.com');
        console.log('Password: abc123');
        console.log('Status: ACTIVE & QUALIFIED');

        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
};

createSuperAdmin();
