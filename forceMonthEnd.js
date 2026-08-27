import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import { franchisePayoutService } from './src/services/business/franchisePayout.service.js';
import { generateDifferentialMasterPayouts } from './src/services/business/masterPayout.service.js';

const runMonthEnd = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await connectDB();
        console.log('Connected.');

        console.log('Dropping outdated March ledgers to execute a fresh run...');
        try {
            await mongoose.connection.collection('franchisepayouts').deleteMany({ month: 3, year: 2026 });
            await mongoose.connection.collection('masterfranchisepayouts').deleteMany({ month: 3, year: 2026 });
            await mongoose.connection.collection('franchisepayouts').dropIndexes();
        } catch (e) {
            console.log('Error dropping ledgers/indexes.', e.message);
        }

        console.log('Executing Franchise BV/PV Reset & Record Generation...');
        await franchisePayoutService.generateMonthlyPayouts();

        console.log('Executing Master Differential Generation...');
        await generateDifferentialMasterPayouts();

        console.log('Successfully finalized March Payouts and reset April states to 0.');
        process.exit(0);
    } catch (error) {
        console.error('Failed', error);
        process.exit(1);
    }
};

runMonthEnd();
