import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.model.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const countLeg = async (nodeId, indent = '') => {
    if (!nodeId) return 0;
    const node = await User.findById(nodeId).select('memberId leftChild rightChild');
    if (!node) {
        console.log(`${indent}Node ${nodeId} NOT FOUND`);
        return 0;
    }
    console.log(`${indent}- ${node.memberId} (${node._id})`);

    const left = await countLeg(node.leftChild, indent + '  L: ');
    const right = await countLeg(node.rightChild, indent + '  R: ');
    return 1 + left + right;
};

const verify = async () => {
    await connectDB();
    const targetMemberId = 'SVS000012'; // From user example

    const user = await User.findOne({ memberId: targetMemberId });
    if (!user) {
        console.log('User not found');
        return;
    }

    console.log(`Checking User: ${user.memberId}`);
    console.log(`Stored Left Count: ${user.leftTeamCount}`);
    console.log(`Stored Right Count: ${user.rightTeamCount}`);

    console.log('\n--- Traversing Left Leg ---');
    const realLeft = await countLeg(user.leftChild);

    console.log('\n--- Traversing Right Leg ---');
    const realRight = await countLeg(user.rightChild);

    console.log(`\nReal Left: ${realLeft}`);
    console.log(`Real Right: ${realRight}`);

    if (user.leftTeamCount !== realLeft || user.rightTeamCount !== realRight) {
        console.log('MISMATCH DETECTED!');
    } else {
        console.log('Counts Match!');
    }
    process.exit(0);
};

verify();
