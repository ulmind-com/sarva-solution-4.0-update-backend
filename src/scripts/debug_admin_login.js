import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const debugAdminLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('DB Connected');

        const memberId = 'SVS000001';
        const passwordStart = 'adminpassword13';

        console.log(`Searching for user: ${memberId}`);

        // Find user
        const user = await User.findOne({ memberId }).select('+password'); // Select password explicitly if it's hidden

        if (!user) {
            console.log('❌ User NOT FOUND');
            process.exit(1);
        }

        console.log('✅ User Found:', user.fullName || user.email);
        console.log('Role:', user.role);
        console.log('IsBlocked:', user.isBlocked);
        console.log('Status:', user.status);
        console.log('Hashed Password in DB:', user.password ? 'Has value (hidden)' : 'MISSING!');

        // Check Password
        if (user.password) {
            const isMatch = await bcrypt.compare(passwordStart, user.password);
            console.log(`Password '${passwordStart}' Match:`, isMatch ? '✅ YES' : '❌ NO');

            // If NO match, let's reset it to be sure
            if (!isMatch) {
                console.log('Resetting password to: adminpassword13');
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(passwordStart, salt);

                await User.updateOne({ _id: user._id }, { password: hashedPassword });
                console.log('✅ Password Reset Complete');
            }
        } else {
            console.log('User has no password set!');
        }

        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

debugAdminLogin();
