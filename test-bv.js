import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import BVTransaction from './src/models/BVTransaction.model.js';
import User from './src/models/User.model.js';

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Check total left/right transactions in DB
    const totalTransactions = await BVTransaction.find().limit(5);
    console.log("Random Transactions:", JSON.stringify(totalTransactions, null, 2));

    const leftTransactions = await BVTransaction.find({ legAffected: 'left' }).limit(2);
    console.log("\nLeft Transactions:", JSON.stringify(leftTransactions, null, 2));
    
    // Find Super Admin memberId
    const sa = await User.findOne({ username: 'superadmin' });
    if(sa) {
       console.log("Super Admin _id:", sa._id);
       const saLeftCount = await BVTransaction.countDocuments({ userId: sa._id, legAffected: 'left' });
       console.log("Super Admin Left count:", saLeftCount);
    }
    
    process.exit(0);
}

run();
