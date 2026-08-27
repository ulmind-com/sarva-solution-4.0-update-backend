import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Franchise from '../src/models/Franchise.model.js';
import User from '../src/models/User.model.js';

dotenv.config();

const verifyOne = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // Check 1 Franchise
        const franchise = await Franchise.findOne({});
        if (franchise) {
            console.log('--- Franchise Sample ---');
            console.log('ID:', franchise._id);
            console.log('Shop Address:', JSON.stringify(franchise.shopAddress, null, 2));
            if (franchise.shopAddress && franchise.shopAddress.zipCode) {
                console.log('✅ Franchise Normalized (zipCode exists)');
            } else {
                console.log('❌ Franchise NOT Normalized (missing zipCode)');
            }
        } else {
            console.log('No Franchises found.');
        }

        // Check 1 User
        const user = await User.findOne({});
        if (user) {
            console.log('--- User Sample ---');
            console.log('ID:', user._id);
            console.log('BikeCarFund:', user.bikeCarFund);
            console.log('KYC:', user.kyc);
            if (user.bikeCarFund && user.kyc) {
                console.log('✅ User Normalized (Funds/KYC exist)');
            } else {
                console.log('❌ User NOT Normalized');
            }
        } else {
            console.log('No Users found.');
        }

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyOne();
