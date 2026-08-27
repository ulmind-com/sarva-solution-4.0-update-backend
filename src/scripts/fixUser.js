import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import User from '../models/User.model.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sarvasolution_test_db';

async function fixUser() {
    try {
        await mongoose.connect(MONGO_URI);
        const res = await User.updateOne({memberId: 'SVS85380535'}, { $set: { activationDate: new Date() }});
        console.log('Update result:', res);
    } catch(err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
fixUser();
