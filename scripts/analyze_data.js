import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.model.js';
import Franchise from '../src/models/Franchise.model.js';
import UserFinance from '../src/models/UserFinance.model.js';

dotenv.config({ path: './.env' });

const analyzeData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for analysis...');

        // 1. Analyze Users
        const invalidUsers = await User.find({
            $or: [
                { 'address.street': { $exists: false } },
                { 'address.zipCode': { $exists: false } }, // New schema requires this
                { 'bikeCarFund': { $exists: false } },
                { 'kyc': { $exists: false } }
            ]
        });
        console.log(`Found ${invalidUsers.length} Users with potential schema violations.`);

        // 2. Analyze Franchises
        const invalidFranchises = await Franchise.find({
            $or: [
                { 'shopAddress.street': { $exists: false } },
                { 'shopAddress.pincode': { $exists: false } }, // Old schema naming vs new
                { 'shopAddress.zipCode': { $exists: false } }  // New schema naming
            ]
        });
        console.log(`Found ${invalidFranchises.length} Franchises with potential schema violations.`);
        if (invalidFranchises.length > 0) {
            console.log('Sample invalid franchise address:', invalidFranchises[0].shopAddress);
        }

        // 3. Analyze UserFinance
        const invalidFinance = await UserFinance.find({
            $or: [
                { 'bikeCarFund': { $exists: false } }
            ]
        });
        console.log(`Found ${invalidFinance.length} UserFinance records with missing funds.`);

    } catch (error) {
        console.error('Analysis failed:', error);
    } finally {
        await mongoose.disconnect();
    }
};

analyzeData();
