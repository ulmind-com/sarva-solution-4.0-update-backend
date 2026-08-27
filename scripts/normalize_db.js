
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

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const normalize = async () => {
    try {
        if (!MONGO_URI) throw new Error('MONGO_URI is undefined');
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        console.log('--- Starting Database Normalization ---');

        // 1. Remove directSponsors.members from User
        console.log('Normalizing User collection...');
        const userResult = await User.updateMany(
            {},
            { $unset: { "directSponsors.members": "" } }
        );
        console.log(`Users updated: ${userResult.modifiedCount}`);

        // 2. Remove closingHistory from UserFinance
        console.log('Normalizing UserFinance collection...');
        const financeResult = await UserFinance.updateMany(
            {},
            {
                $unset: {
                    "fastTrack.closingHistory": "",
                    "starMatchingBonus.closingHistory": ""
                }
            }
        );
        console.log(`UserFinance records updated: ${financeResult.modifiedCount}`);

        console.log('Normalization Complete.');
        process.exit(0);

    } catch (error) {
        console.error('Normalization Failed:', error);
        process.exit(1);
    }
};

normalize();
