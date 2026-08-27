import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import BVTransaction from './src/models/BVTransaction.model.js';
import User from './src/models/User.model.js';

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const superAdmin = await User.findOne({ username: 'superadmin' });
        console.log("SuperAdmin:", superAdmin._id);

        const countLeft = await BVTransaction.countDocuments({ userId: superAdmin._id, legAffected: 'left' });
        console.log("Super Admin Left count string:", countLeft);
        
        // Let's do a raw find to check createdAt field
        const tx = await BVTransaction.findOne({ userId: superAdmin._id, legAffected: 'left' });
        console.log("Super Admin Left Tx:", tx ? "Exists" : "None");
        if(tx) console.log("Tx Date:", tx.createdAt);
        
    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
