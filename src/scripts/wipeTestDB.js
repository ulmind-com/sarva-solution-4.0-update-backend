import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import User from '../models/User.model.js';
import UserFinance from '../models/UserFinance.model.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sarvasolution_test_db';

async function wipeAndSeed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB:', mongoose.connection.name);

        // Drop the entire database
        console.log('Dropping database...');
        await mongoose.connection.db.dropDatabase();
        console.log('Database dropped successfully.');

        // Recreate the super admin
        console.log('Creating Admin SVS000001...');
        const admin = await User.create({
            username: 'superadmin',
            email: 'admin@admin.com',
            password: 'admin123', // Will be hashed by pre-save hook
            fullName: 'Super Admin',
            phone: '0000000000',
            memberId: 'SVS000001',
            sponsorId: null,
            parentId: null,
            position: 'root',
            sponsorLeg: 'none',
            leftDirectActive: 1,
            rightDirectActive: 1,
            kyc: { status: 'approved' }, // Use 'approved' instead of 'verified' which was breaking validation
            role: 'admin',
            status: 'active'
        });

        console.log('Admin user created successfully:', admin.memberId);

        // Ensure Finance Record
        await UserFinance.create({
            user: admin._id,
            memberId: admin.memberId,
            currentRank: 'Associate',
            isStar: false,
            wallet: { totalEarnings: 0, availableBalance: 0 }
        });
        
        console.log('Admin finance record created successfully.');

    } catch(err) {
        console.error('Error during wipe and seed:', err);
    } finally {
        process.exit(0);
    }
}

wipeAndSeed();
