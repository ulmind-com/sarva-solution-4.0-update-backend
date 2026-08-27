import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

// Setup file logging
const LOG_FILE = path.join(process.cwd(), 'admin_init.log');
function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    fs.appendFileSync(LOG_FILE, line);
    console.log(msg);
}

// Clear log file
if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

log('='.repeat(50));
log('ROOT ADMIN INITIALIZATION SCRIPT');
log('='.repeat(50));

// Load environment
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../');
const envPath = path.join(rootDir, '.env');

log(`Loading .env from: ${envPath}`);
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    log('✅ .env file loaded');
} else {
    log('❌ .env file NOT FOUND');
    process.exit(1);
}

// Import models
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';

async function connectDB() {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) {
            throw new Error('MONGO_URI is not defined in .env');
        }
        await mongoose.connect(uri);
        log('✅ MongoDB Connection Successful');
    } catch (err) {
        log(`❌ MongoDB Connection Error: ${err.message}`);
        process.exit(1);
    }
}

async function initRootAdmin() {
    try {
        await connectDB();

        log('');
        log('🔍 Checking for existing admin...');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ memberId: 'SVS000001' });

        if (existingAdmin) {
            log(`⚠️  Admin already exists: ${existingAdmin.email}`);
            log('   Use --force flag to recreate (not implemented for safety)');
            await mongoose.disconnect();
            process.exit(0);
        }

        log('');
        log('👤 Creating Root Admin User...');

        // Create Root Admin with exact specifications
        const rootAdmin = await User.create({
            username: 'rootadmin',
            email: 'admin@sarvasolution.com',
            password: 'abc123', // Plain text (will be hashed by model pre-save hook)
            fullName: 'Super Admin',
            phone: '0000000000',
            memberId: 'SVS000001',

            // MLM Structure - Root position
            sponsorId: null,
            parentId: null,
            position: 'root',
            sponsorLeg: 'none',
            leftChild: null,
            rightChild: null,

            // PV/BV Initial Values
            personalPV: 100,
            leftLegPV: 0,
            rightLegPV: 0,
            totalPV: 100,
            thisMonthPV: 0,
            thisYearPV: 0,

            personalBV: 0,
            leftLegBV: 0,
            rightLegBV: 0,
            totalBV: 0,
            thisMonthBV: 2000,
            thisYearBV: 12000,
            carryForwardLeft: 0,
            carryForwardRight: 0,

            // Team Counts
            leftTeamCount: 0,
            rightTeamCount: 0,
            leftDirectActive: 0,
            leftDirectInactive: 0,
            rightDirectActive: 0,
            rightDirectInactive: 0,

            // Direct Sponsors (initially empty, will be populated as users join)
            directSponsors: {
                count: 0,
                members: []
            },

            // Rank System
            currentRank: 'Associate',
            rankNumber: 14,
            starMatching: 0,
            rankBonus: 0,
            rankHistory: [],

            // Fund Systems (default empty)
            bikeCarFund: {
                units: 0,
                totalBVContributed: 0,
                nextTargetBV: 100000
            },
            houseFund: {
                units: 0,
                totalBVContributed: 0,
                nextTargetBV: 250000,
                paymentSchedule: 'half-yearly'
            },
            royaltyFund: {
                units: 0,
                totalBVContributed: 0,
                nextTargetBV: 750000,
                paymentSchedule: 'annual'
            },
            ssvplSuperBonus: {
                units: 0,
                totalBVContributed: 0,
                nextTargetBV: 2500000
            },

            // Bonus Tracking (default empty)
            selfPurchase: {
                totalPurchases: 0,
                thisMonthBV: 0,
                bonusEarned: 0,
                eligibleForPrize: false
            },
            beginnerBonus: {
                units: 0,
                cappingReached: 0,
                cappingLimit: 10,
                totalBV: 0
            },
            startUpBonus: {
                units: 0,
                totalBV: 0
            },
            leadershipBonus: {
                units: 0,
                totalBV: 0
            },
            tourFund: {
                units: 0,
                totalBV: 0
            },
            healthEducation: {
                units: 0,
                totalBV: 0
            },

            // Fast Track & Star Matching (empty)
            fastTrack: {
                lastClosingTime: null,
                dailyClosings: 0,
                pendingPairLeft: 0,
                pendingPairRight: 0,
                carryForwardLeft: 0,
                carryForwardRight: 0,
                closingHistory: [],
                weeklyEarnings: 0
            },
            starMatchingBonus: {
                lastClosingTime: null,
                dailyClosings: 0,
                pendingStarsLeft: 0,
                pendingStarsRight: 0,
                carryForwardStarsLeft: 0,
                carryForwardStarsRight: 0,
                closingHistory: [],
                weeklyEarnings: 0
            },

            // LSP & MSP (not achieved)
            lsp: {
                achieved: false,
                currentBV: 0,
                targetBV: 100000
            },
            msp: {
                achieved: false,
                currentBV: 0,
                targetBV: 500000
            },

            // Eligibility and Compliance
            eligibleForBonuses: true,
            compliance: {
                kycVerified: true,
                documentsSubmitted: true,
                lastReviewDate: new Date()
            },

            // Wallet (empty balance)
            wallet: {
                totalEarnings: 0,
                currentBalance: 0,
                onHold: 0,
                totalWithdrawn: 0,
                pendingWithdrawals: 0
            },

            // Address (empty initially)
            address: {
                street: '',
                city: '',
                state: '',
                country: 'India',
                pincode: ''
            },

            // KYC (verified for admin)
            kyc: {
                isVerified: true,
                verifiedAt: new Date(),
                verifiedBy: null
            },

            // Profile Picture (optional)
            profilePicture: {
                url: '',
                publicId: ''
            },

            // Role and Status
            role: 'admin',
            status: 'active',
            isFirstPurchaseDone: false,

            // Timestamps
            lastBVUpdate: new Date()
        });

        log(`✅ Root Admin Created: ${rootAdmin.email} (${rootAdmin.memberId})`);

        // Create corresponding UserFinance record
        log('');
        log('💰 Creating UserFinance record...');

        const adminFinance = await UserFinance.create({
            user: rootAdmin._id,
            memberId: rootAdmin.memberId,

            // PV Tracking
            personalPV: 100,
            leftLegPV: 0,
            rightLegPV: 0,
            totalPV: 100,
            thisMonthPV: 0,
            thisYearPV: 0,

            // BV Tracking
            personalBV: 0,
            leftLegBV: 0,
            rightLegBV: 0,
            totalBV: 0,
            thisMonthBV: 2000,
            thisYearBV: 12000,
            carryForwardLeft: 0,
            carryForwardRight: 0,

            // Wallet
            wallet: {
                totalEarnings: 0,
                availableBalance: 0,
                withdrawnAmount: 0,
                pendingWithdrawal: 0
            },

            // Rank
            currentRank: 'Associate',
            rankNumber: 14,
            starMatching: 0,
            rankBonus: 0,
            rankHistory: [],

            // Fund Systems
            bikeCarFund: {
                units: 0,
                totalBVContributed: 0,
                nextTargetBV: 100000
            },
            houseFund: {
                units: 0,
                totalBVContributed: 0,
                nextTargetBV: 250000,
                paymentSchedule: 'half-yearly'
            },
            royaltyFund: {
                units: 0,
                totalBVContributed: 0,
                nextTargetBV: 750000,
                paymentSchedule: 'annual'
            },
            ssvplSuperBonus: {
                units: 0,
                totalBVContributed: 0,
                nextTargetBV: 2500000
            },

            // Bonus Tracking
            selfPurchase: {
                totalPurchases: 0,
                thisMonthBV: 0,
                bonusEarned: 0,
                eligibleForPrize: false
            },
            beginnerBonus: {
                units: 0,
                cappingReached: 0,
                cappingLimit: 10,
                totalBV: 0
            },
            startUpBonus: { units: 0, totalBV: 0 },
            leadershipBonus: { units: 0, totalBV: 0 },
            tourFund: { units: 0, totalBV: 0 },
            healthEducation: { units: 0, totalBV: 0 },

            // Fast Track & Star Matching
            fastTrack: {
                lastClosingTime: null,
                dailyClosings: 0,
                pendingPairLeft: 0,
                pendingPairRight: 0,
                carryForwardLeft: 0,
                carryForwardRight: 0,
                closingHistory: [],
                weeklyEarnings: 0
            },
            starMatchingBonus: {
                lastClosingTime: null,
                dailyClosings: 0,
                pendingStarsLeft: 0,
                pendingStarsRight: 0,
                carryForwardStarsLeft: 0,
                carryForwardStarsRight: 0,
                closingHistory: [],
                weeklyEarnings: 0
            },

            // Stock Points
            lsp: {
                achieved: false,
                currentBV: 0,
                targetBV: 100000
            },
            msp: {
                achieved: false,
                currentBV: 0,
                targetBV: 500000
            }
        });

        log(`✅ UserFinance Created for: ${adminFinance.memberId}`);

        log('');
        log('='.repeat(50));
        log('✅ ROOT ADMIN INITIALIZATION COMPLETED');
        log('='.repeat(50));
        log('');
        log('📋 Admin Credentials:');
        log(`   Email:    admin@sarvasolution.com`);
        log(`   Password: abc123`);
        log(`   Member ID: SVS000001`);
        log(`   Role:     admin`);
        log('');
        log('⚠️  IMPORTANT: Change the password after first login!');
        log('');

        await mongoose.disconnect();
        log('✅ Database disconnected');
        process.exit(0);

    } catch (error) {
        log('');
        log(`❌ ERROR: ${error.message}`);
        log(error.stack);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
}

// Execute
initRootAdmin();
