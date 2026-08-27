import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const resetPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('DB Connected');

        const memberId = 'SVS000001';
        const newPassword = 'adminpassword13';

        console.log(`Resetting password for: ${memberId}`);

        const user = await User.findOne({ memberId });

        if (!user) {
            console.log('❌ User NOT FOUND. Please check if SVS000001 exists.');
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await User.updateOne({ _id: user._id }, { password: hashedPassword });

        console.log(`✅ Password for ${memberId} has been reset to: ${newPassword}`);
        console.log('Please try logging in again.');

        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

resetPassword();
