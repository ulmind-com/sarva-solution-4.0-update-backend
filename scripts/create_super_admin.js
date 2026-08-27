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

const createSuperAdmin = async () => {
    try {
        console.log('=== CREATING SUPER ADMIN ===\n');
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
        console.log('✓ Connected to database\n');

        // Check if admin already exists
        const existing = await User.findOne({ memberId: 'SVS000001' });
        if (existing) {
            console.log('⚠️  Super Admin already exists. Deleting...');
            await User.deleteOne({ _id: existing._id });
            await UserFinance.deleteOne({ user: existing._id });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash('abc123', 12);

        // Create Super Admin User
        const admin = await User.create({
            username: 'rootadmin',
            email: 'admin@sarvasolution.com',
            password: hashedPassword,
            fullName: 'Super Admin',
            phone: '0000000000',
            memberId: 'SVS000001',

            // MLM Structure (Root position)
            sponsorId: null,
            parentId: null,
            position: 'root',
            sponsorLeg: 'none',
            leftChild: null,
            rightChild: null,

            // Qualification Setup (Pre-qualified for testing)
            // In production, these will be 0 until actual users join
            leftDirectActive: 1,  // Set to 1 so they qualify immediately
            rightDirectActive: 1, // Set to 1 so they qualify immediately

            // PV/BV Tracking
            personalBV: 0,
            leftLegBV: 0,
            rightLegBV: 0,
            personalPV: 0,
            leftLegPV: 0,
            rightLegPV: 0,
            totalPV: 0,
            totalBV: 0,

            // KYC (VERIFIED for production)
            kyc: {
                status: 'verified',
                verifiedAt: new Date()
            },

            // Status
            role: 'admin',
            status: 'active', // ACTIVE status

            // Profile
            profilePicture: {
                url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT11ii7P372sU9BZPZgOR6ohoQbBJWbkJ0OVA&s'
            }
        });

        console.log('✅ Super Admin User created:', admin.memberId);

        // Create UserFinance record
        const finance = await UserFinance.create({
            user: admin._id,
            memberId: 'SVS000001',

            // Wallet
            wallet: {
                totalEarnings: 0,
                availableBalance: 0,
                withdrawnAmount: 0,
                pendingWithdrawal: 0
            },

            // Fast Track
            fastTrack: {
                pendingPairLeft: 0,
                pendingPairRight: 0,
                carryForwardLeft: 0,
                carryForwardRight: 0,
                dailyClosings: 0,
                weeklyEarnings: 0,
                monthlyEarnings: 0,
                totalEarned: 0
            },

            // Star Matching
            starMatchingBonus: {
                pendingStarsLeft: 0,
                pendingStarsRight: 0,
                carryForwardStarsLeft: 0,
                carryForwardStarsRight: 0,
                dailyClosings: 0,
                weeklyEarnings: 0,
                monthlyEarnings: 0,
                totalEarned: 0
            },

            // Rank
            currentRank: 'Associate',
            rankNumber: 14,
            isStar: false,
            starMatching: 0,
            currentRankMatchCount: 0,

            // BV/PV
            personalBV: 0,
            leftLegBV: 0,
            rightLegBV: 0,
            totalBV: 0,
            personalPV: 0,
            leftLegPV: 0,
            rightLegPV: 0,
            totalPV: 0
        });

        console.log('✅ UserFinance created for:', finance.memberId);

        console.log('\n=== SUPER ADMIN SETUP COMPLETE ===');
        console.log('📋 Details:');
        console.log(`   Member ID: ${admin.memberId}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Password: abc123`);
        console.log(`   Status: ${admin.status}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   KYC: ${admin.kyc.status}`);
        console.log(`   Left Direct Active: ${admin.leftDirectActive}`);
        console.log(`   Right Direct Active: ${admin.rightDirectActive}`);
        console.log('\n✅ Ready to receive bonuses when downline joins!\n');

        process.exit(0);

    } catch (e) {
        console.error('❌ Failed to create Super Admin:', e);
        process.exit(1);
    }
};

createSuperAdmin();
