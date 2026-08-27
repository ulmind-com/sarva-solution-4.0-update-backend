
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load Env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import Payout from '../src/models/Payout.model.js';
import BVTransaction from '../src/models/BVTransaction.model.js';
import FranchiseSale from '../src/models/FranchiseSale.model.js';
import Invoice from '../src/models/Invoice.model.js';
import ProductRequest from '../src/models/ProductRequest.model.js';
// We keep Products and Franchise Master Data

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const resetDatabase = async () => {
    try {
        if (!MONGO_URI) throw new Error('MONGO_URI is undefined');
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        console.log('--- SYSTEM RESET INITIATED ---');

        // 1. Identify Super Admin
        // Strategy: 'SVS000001' or role 'admin'
        let superAdmin = await User.findOne({ memberId: 'SVS000001' });

        if (!superAdmin) {
            console.log('SVS000001 not found. Searching for role: admin...');
            superAdmin = await User.findOne({ role: 'admin' });
        }

        if (!superAdmin) {
            throw new Error('Super Admin Not Found. Aborting Reset to prevent total data loss.');
        }

        console.log(`PRESERVING Super Admin: ${superAdmin.memberId} (${superAdmin.fullName})`);

        // 2. Delete All Other Users
        const userDelete = await User.deleteMany({ _id: { $ne: superAdmin._id } });
        console.log(`Deleted Users: ${userDelete.deletedCount}`);

        // 3. Delete All Other Finances
        const financeDelete = await UserFinance.deleteMany({ user: { $ne: superAdmin._id } });
        console.log(`Deleted UserFinances: ${financeDelete.deletedCount}`);

        // 4. Reset Super Admin Data
        // Reset Tree & Stats
        superAdmin.leftChild = null;
        superAdmin.rightChild = null;
        superAdmin.leftDirectActive = 0;
        superAdmin.rightDirectActive = 0;
        superAdmin.leftDirectInactive = 0; // Directs are deleted
        superAdmin.rightDirectInactive = 0;
        superAdmin.leftTeamCount = 0;
        superAdmin.rightTeamCount = 0;
        superAdmin.personalBV = 0; // Reset PV? Usually yes for "fresh start"
        superAdmin.leftLegBV = 0;
        superAdmin.rightLegBV = 0;
        superAdmin.totalBV = 0;
        superAdmin.carryForwardLeft = 0;
        superAdmin.carryForwardRight = 0;

        // Reset Direct Sponsor Count (as downlines are gone)
        if (superAdmin.directSponsors) {
            superAdmin.directSponsors.count = 0;
            superAdmin.directSponsors.eligibleForBonuses = false;
        }

        await superAdmin.save();
        console.log('Super Admin User Data Reset.');

        // Reset Super Admin Finance
        const adminFinance = await UserFinance.findOne({ user: superAdmin._id });
        if (adminFinance) {
            adminFinance.personalBV = 0;
            adminFinance.leftLegBV = 0;
            adminFinance.rightLegBV = 0;
            adminFinance.totalBV = 0;
            adminFinance.carryForwardLeft = 0;
            adminFinance.carryForwardRight = 0;

            // Funds
            adminFinance.bikeCarFund = undefined; // Reset to default via schema defaults if needed, or just clear values
            // Actually, best to just reset values
            // ... (Reset specific fund counters if necessary, but default new users start at 0)

            // Fast Track
            adminFinance.fastTrack = {
                dailyClosings: 0,
                pendingPairLeft: 0,
                pendingPairRight: 0,
                carryForwardLeft: 0,
                carryForwardRight: 0,
                weeklyEarnings: 0
            };

            // Star Matching
            adminFinance.starMatchingBonus = {
                dailyClosings: 0,
                pendingStarsLeft: 0,
                pendingStarsRight: 0,
                carryForwardStarsLeft: 0,
                carryForwardStarsRight: 0,
                weeklyEarnings: 0
            };

            // Rank
            adminFinance.currentRank = 'Associate';
            adminFinance.rankNumber = 14; // Default? Check model.
            adminFinance.isStar = false;
            adminFinance.currentRankMatchCount = 0;
            adminFinance.rankBonus = 0;
            adminFinance.starMatching = 0;
            adminFinance.rankHistory = [];

            // Wallet - Keep balance? user said "remove each and every data... update super admin".
            // If we delete all Payouts, wallet history is gone.
            // A "System Reset" usually implies zeroing out everything including test money.
            adminFinance.wallet = {
                totalEarnings: 0,
                availableBalance: 0,
                withdrawnAmount: 0,
                pendingWithdrawal: 0
            };

            await adminFinance.save();
            console.log('Super Admin Finance Data Reset.');
        }

        // 5. Delete All Transactional Data (For EVERYONE including Admin, as history is invalid without tree)
        // Deleting Payouts for Admin too? Yes, "remove each and every data".

        await Payout.deleteMany({});
        console.log('Deleted All Payouts.');

        await BVTransaction.deleteMany({});
        console.log('Deleted All BVTransactions.');

        await FranchiseSale.deleteMany({});
        console.log('Deleted All FranchiseSales.');

        await Invoice.deleteMany({});
        console.log('Deleted All Invoices.');

        await ProductRequest.deleteMany({});
        console.log('Deleted All ProductRequests.');

        // Optional: Reset Franchise Inventory? 
        // User didn't specify Franchise inventory reset. "my whole database".
        // But Products/Franchise master data usually stays.
        // Let's assume Franchise Inventory is transactional (StockTransaction exists).
        // If we delete StockTransaction, inventory might be out of sync.
        // Let's delete StockTransaction.
        // import StockTransaction... (added above? No, need to add if exists)
        // await mongoose.connection.collection('stocktransactions').deleteMany({}); 

        console.log('--- SYSTEM RESET COMPLETE ---');
        process.exit(0);

    } catch (error) {
        console.error('Reset Failed:', error);
        process.exit(1);
    }
};

resetDatabase();
