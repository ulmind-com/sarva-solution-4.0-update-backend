import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import BankAccount from '../models/BankAccount.model.js';
import connectDB from '../config/db.js';

dotenv.config();

const seedRootUser = async () => {
    try {
        await connectDB();

        const userCount = await User.countDocuments();
        if (userCount > 0) {
            console.log('Users already exist. Cannot seed root user.');
            process.exit(1);
        }

        const rootUser = new User({
            username: 'rootadmin',
            email: 'admin@sarvasolution.com',
            password: 'adminpassword123', // Will be hashed by pre-save hook
            fullName: 'Super Admin',
            phone: '0000000000',
            memberId: 'SVS000001',
            sponsorId: null, // No sponsor for root
            parentId: null, // No parent for root
            position: 'root',
            joiningPackage: 10000,
            status: 'active',
            rank: 'Diamond',
            personalPV: 1000,
            totalPV: 1000,
            address: {
                street: 'Admin St',
                city: 'Admin City',
                state: 'Admin State',
                country: 'Admin Country',
                zipCode: '000000'
            },
            role: 'admin'
        });

        await rootUser.save();

        const rootUserBankAccount = new BankAccount({
            userId: rootUser._id,
            accountName: 'Admin',
            accountNumber: '0000000000',
            bankName: 'Admin Bank',
            ifscCode: 'ADMIN0000',
            branch: 'Headquarters'
        });

        await rootUserBankAccount.save();

        console.log('Root user created successfully!');
        console.log(`Member ID: ${rootUser.memberId}`);
        console.log(`Username: ${rootUser.username}`);
        console.log('Password: adminpassword123');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding root user:', error);
        process.exit(1);
    }
};

seedRootUser();
