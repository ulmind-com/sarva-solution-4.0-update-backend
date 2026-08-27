import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import UserFinance from '../models/UserFinance.model.js';
import BankAccount from '../models/BankAccount.model.js';
import connectDB from '../config/db.js';

dotenv.config();

const createProductionAdmin = async () => {
    try {
        await connectDB();

        const email = 'sarvasolution25@gmail.com';
        const memberId = 'SVS000001';

        // Check if admin already exists
        const existingUser = await User.findOne({ $or: [{ email }, { memberId }] });
        if (existingUser) {
            console.log('User with this email or Member ID already exists.');
            console.log(`Existing ID: ${existingUser._id}`);
            console.log(`Member ID: ${existingUser.memberId}`);
            process.exit(1);
        }

        console.log('Creating Super Admin...');

        const adminUser = new User({
            username: 'ssvpl_admin',
            email: email,
            password: 'adminpassword123', // Pre-save hook will hash this
            fullName: 'SSVPL ADMIN',
            phone: '9832775700',
            panCardNumber: 'ABRCS5991B',
            memberId: memberId,
            sponsorId: null, // Root
            parentId: null, // Root
            position: 'root',
            role: 'admin',
            status: 'active',
            isFirstPurchaseDone: true, // Auto-active for admin

            // Default Rank & BV
            currentRank: 'Associate',
            personalPV: 0,
            totalPV: 0,

            address: {
                street: 'Headquarters',
                city: 'Kolkata',
                state: 'West Bengal',
                country: 'India',
                zipCode: '700001'
            }
        });

        await adminUser.save();
        console.log('User document created.');

        // Create UserFinance
        const userFinance = new UserFinance({
            user: adminUser._id,
            memberId: adminUser.memberId,
            personalPV: 0,
            totalPV: 0,
            wallet: {
                totalEarnings: 0,
                availableBalance: 0,
                withdrawnAmount: 0
            }
        });

        await userFinance.save();
        console.log('UserFinance document created.');

        // Create BankAccount (Optional but good for completeness)
        const bankAccount = new BankAccount({
            userId: adminUser._id,
            accountName: 'SSVPL ADMIN',
            accountNumber: '0000000000',
            bankName: 'Official Bank',
            ifscCode: 'ADMIN0000',
            branch: 'Main Branch'
        });

        await bankAccount.save();
        console.log('BankAccount document created.');

        console.log('-------------------------------------------');
        console.log('SUCCESS: Production Super Admin Created');
        console.log(`Name: ${adminUser.fullName}`);
        console.log(`Member ID: ${adminUser.memberId}`);
        console.log(`Email: ${adminUser.email}`);
        console.log(`Password: adminpassword123`);
        console.log('-------------------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createProductionAdmin();
