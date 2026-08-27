import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import User from '../models/User.model.js';
import UserFinance from '../models/UserFinance.model.js';
import BankAccount from '../models/BankAccount.model.js';
import FranchiseSale from '../models/FranchiseSale.model.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sarvasolution_test_db';

const targetMemberIds = [
    'SVS55163503', // test1000
    'SVS85380535', // test10001
    'SVS87437596', // test77
    'SVS17986021'  // test777
];

async function deleteTestUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const users = await User.find({ memberId: { $in: targetMemberIds } });
        const userIds = users.map(u => u._id);
        
        console.log(`Found ${userIds.length} users to delete.`);

        if (userIds.length > 0) {
            // Delete Finances
            const financeRes = await UserFinance.deleteMany({ user: { $in: userIds } });
            console.log(`Deleted ${financeRes.deletedCount} finance records.`);

            // Delete Bank Accounts
            const bankRes = await BankAccount.deleteMany({ userId: { $in: userIds } });
            console.log(`Deleted ${bankRes.deletedCount} bank accounts.`);

            // Delete Franchise Sales
            const salesRes = await FranchiseSale.deleteMany({ user: { $in: userIds } });
            console.log(`Deleted ${salesRes.deletedCount} franchise sales.`);

            // Delete Users
            const userRes = await User.deleteMany({ _id: { $in: userIds } });
            console.log(`Deleted ${userRes.deletedCount} users.`);
        }

    } catch(err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

deleteTestUsers();
