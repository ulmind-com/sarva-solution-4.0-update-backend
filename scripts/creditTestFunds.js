import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.model.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFile = path.join(__dirname, 'debug_log.txt');

function log(message) {
    const time = new Date().toISOString();
    const msg = `[${time}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(logFile, msg);
}

// Load env explicitly from root
dotenv.config({ path: path.join(__dirname, '../.env') });

log('Script started...');
if (!process.env.MONGO_URI) {
    log('MONGO_URI is missing in .env');
    process.exit(1);
}

const connectDB = async () => {
    try {
        log(`Connecting to MongoDB... ${process.env.MONGO_URI.substring(0, 15)}...`);
        await mongoose.connect(process.env.MONGO_URI);
        log('MongoDB Connected');
    } catch (error) {
        log(`Database connection error: ${error.message}`);
        process.exit(1);
    }
};

const creditFunds = async () => {
    await connectDB();

    const memberId = 'SVS000002';
    const amount = 5000;

    try {
        const user = await User.findOne({ memberId });

        if (!user) {
            log(`User ${memberId} not found`);
            process.exit(1);
        }

        log(`Current Balance: ${user.wallet.availableBalance}`);

        user.wallet.availableBalance = (user.wallet.availableBalance || 0) + amount;
        user.wallet.totalEarnings = (user.wallet.totalEarnings || 0) + amount;

        await user.save();

        log(`Successfully credited ${amount} to ${memberId}`);
        log(`New Balance: ${user.wallet.availableBalance}`);

    } catch (error) {
        log(`Error crediting funds: ${error.message}`);
    } finally {
        await mongoose.disconnect();
        log('Disconnected');
        process.exit(0);
    }
};

creditFunds();
