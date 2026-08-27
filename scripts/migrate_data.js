import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Franchise from '../src/models/Franchise.model.js';
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';

dotenv.config({ path: './.env' });

const migrateData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for enhanced migration...');

        // 1. Franchise Migration (pincode -> zipCode)
        console.log('Checking Franchises for legacy pincode field...');
        // Use raw collection to bypass mongoose schema filtering
        const franchises = await Franchise.collection.find({
            'shopAddress.pincode': { $exists: true }
        }).toArray();

        console.log(`Found ${franchises.length} franchises with legacy 'pincode'. Migrating...`);

        if (franchises.length > 0) {
            const bulkOps = franchises.map(doc => ({
                updateOne: {
                    filter: { _id: doc._id },
                    update: {
                        $rename: { 'shopAddress.pincode': 'shopAddress.zipCode' }
                    }
                }
            }));
            const result = await Franchise.collection.bulkWrite(bulkOps);
            console.log(`Migrated ${result.modifiedCount} franchises.`);
        } else {
            console.log('No franchises needed migration (pincode not found).');
        }

        // 2. User Migration (Missing/Null Funds & KYC)
        console.log('Checking Users for missing funds/kyc...');
        // Updates for missing objects or empty objects
        const userDefaults = {
            bikeCarFund: { units: 0, totalBVContributed: 0, nextTargetBV: 100000 },
            houseFund: { units: 0, totalBVContributed: 0, nextTargetBV: 250000, paymentSchedule: 'half-yearly' },
            royaltyFund: { units: 0, totalBVContributed: 0, nextTargetBV: 750000, paymentSchedule: 'annual' },
            ssvplSuperBonus: { units: 0, totalBVContributed: 0, nextTargetBV: 2500000 },
            kyc: { status: 'none' },
            address: {}
        };

        const userUpdateResult = await User.collection.updateMany(
            {
                $or: [
                    { bikeCarFund: { $exists: false } },
                    { bikeCarFund: null },
                    { kyc: { $exists: false } }, // simplistic check, assumes if one fund missing, check all
                    { 'address.zipCode': { $exists: false } } // check existing address validity? No, just ensure object exists.
                ]
            },
            {
                $set: {
                    // Use $ifNull to preserve existing data if somehow mixed? 
                    // No, updateMany with strict filters is safer, but here we want to patch holes.
                    // We can use pipeline updates for more logic but keeping it simple:
                    // Just ensuring the structure exists.
                },
                // Mongoose might not let us use $set with conditional logic easily in simple updateMany without pipeline.
                // Let's use a simpler approach: Set defaults ONLY where missing.
                // But we can't easily express "set X if X is missing" for multiple fields in one go without pipeline.
                // Let's use 4 separate updateMany calls to be safe and clear.
            }
        );

        // Batch 1: Funds
        const r1 = await User.collection.updateMany(
            { $or: [{ bikeCarFund: { $exists: false } }, { bikeCarFund: null }] },
            { $set: { bikeCarFund: userDefaults.bikeCarFund } }
        );
        const r2 = await User.collection.updateMany(
            { $or: [{ houseFund: { $exists: false } }, { houseFund: null }] },
            { $set: { houseFund: userDefaults.houseFund } }
        );
        const r3 = await User.collection.updateMany(
            { $or: [{ royaltyFund: { $exists: false } }, { royaltyFund: null }] },
            { $set: { royaltyFund: userDefaults.royaltyFund } }
        );
        const r4 = await User.collection.updateMany(
            { $or: [{ ssvplSuperBonus: { $exists: false } }, { ssvplSuperBonus: null }] },
            { $set: { ssvplSuperBonus: userDefaults.ssvplSuperBonus } }
        );

        // Batch 2: KYC
        const r5 = await User.collection.updateMany(
            { $or: [{ kyc: { $exists: false } }, { kyc: null }] },
            { $set: { kyc: userDefaults.kyc } }
        );

        // Batch 3: Address (Initialize empty object if missing, but don't overwrite if present)
        const r6 = await User.collection.updateMany(
            { $or: [{ address: { $exists: false } }, { address: null }] },
            { $set: { address: userDefaults.address } }
        );

        console.log(`User Migration Results:
            BikeCarFund Fixed: ${r1.modifiedCount}
            HouseFund Fixed: ${r2.modifiedCount}
            RoyaltyFund Fixed: ${r3.modifiedCount}
            SuperBonus Fixed: ${r4.modifiedCount}
            KYC Fixed: ${r5.modifiedCount}
            Address Fixed: ${r6.modifiedCount}`);

        // 3. UserFinance Migration
        console.log('Checking UserFinance...');
        const f1 = await UserFinance.collection.updateMany(
            { $or: [{ bikeCarFund: { $exists: false } }, { bikeCarFund: null }] },
            { $set: { bikeCarFund: userDefaults.bikeCarFund } }
        );
        // ... (repeat for other funds if needed, assuming they match User defaults)
        // For brevity/correctness, let's do all funds.
        await UserFinance.collection.updateMany(
            { $or: [{ houseFund: { $exists: false } }, { houseFund: null }] }, // simplified for efficiency, assume all funds missing if one is
            {
                $set: {
                    houseFund: userDefaults.houseFund,
                    royaltyFund: userDefaults.royaltyFund,
                    ssvplSuperBonus: userDefaults.ssvplSuperBonus
                }
            }
        );

        console.log(`UserFinance Migration: Fixed ${f1.modifiedCount} records.`);

    } catch (error) {
        console.error('Enhanced Migration Failed:', error);
    } finally {
        await mongoose.disconnect();
    }
};

migrateData();
