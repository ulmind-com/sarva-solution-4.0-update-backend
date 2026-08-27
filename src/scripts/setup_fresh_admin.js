import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const setupFreshAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('DB Connected');

        const adminData = {
            memberId: 'SVS000001',
            fullName: 'SSVPL ADMIN',
            email: 'sarvasolution25@gmail.com',
            phone: '9832775700',
            password: 'adminpassword123',
            panCardNumber: 'ABRCS5991B',
            role: 'admin',
            status: 'active',
            isVerified: true,
            kyc: {
                status: 'verified',
                verifiedAt: new Date()
            },
            joiningPackage: 0,
            rank: 'Company',
            leftTeamCount: 0,
            rightTeamCount: 0,
            directsCount: 0
        };

        // Check if exists
        const existing = await User.findOne({
            $or: [
                { memberId: adminData.memberId },
                { email: adminData.email },
                { phone: adminData.phone }
            ]
        });

        if (existing) {
            console.log('User already exists:', existing.memberId, existing.email);
            console.log('Updating password and details...');

            // For update, we MUST manual hash because updateOne bypasses hooks
            // But we can use `existing.save()` which TRIGGERS hooks.
            // However, modifying `existing.password = plainText` and calling save() 
            // will trigger the hook: "if (!this.isModified('password')) return;"
            // It will see it is modified, and hash it (Line 219: this.password = await bcrypt.hash(this.password, 12);)
            // So we should set plain text password if we use .save()

            existing.password = adminData.password; // Plain text
            existing.fullName = adminData.fullName;
            existing.panCardNumber = adminData.panCardNumber;
            existing.role = 'admin';
            existing.status = 'active';

            // Ensure MemberID matches request if it was found by Email/Phone but has diff ID?
            // User requested SVS000001. If found by email but ID is dif, we should probably warn or update.
            // But since DB is "cleared", existing is likely null or exactly this.
            if (existing.memberId !== adminData.memberId) {
                console.log(`Warning: Found user by email/phone but MemberID is ${existing.memberId}. Updating to ${adminData.memberId}`);
                existing.memberId = adminData.memberId;
            }

            await existing.save();
            console.log('✅ Admin Updated Successfully');

        } else {
            console.log('Creating New Admin...');

            // Using User.create triggers hooks.
            // So we provide PLAIN TEXT password.
            // The hook at line 217 will hash it.

            const newUser = new User(adminData);
            await newUser.save();
            console.log('✅ Admin Created Successfully');
        }

        console.log(`credentials: ID=${adminData.memberId} PW=${adminData.password}`);
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

setupFreshAdmin();
