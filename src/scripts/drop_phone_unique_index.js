/**
 * Migration: Drop phone unique index from users collection
 * --------------------------------------------------------
 * The `phone` field in the User model previously had `unique: true`.
 * This has been removed at the schema level. This script drops the
 * corresponding MongoDB index so the DB matches the schema.
 *
 * SAFE TO RUN MULTIPLE TIMES — checks if the index exists before
 * attempting to drop it.
 *
 * Usage:
 *   node src/scripts/drop_phone_unique_index.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dropPhoneIndex = async () => {
    try {
        await connectDB();
        console.log('✅ DB Connected.\n');

        const collection = mongoose.connection.collection('users');

        // List all current indexes
        const indexes = await collection.indexes();
        console.log('📋 Current indexes on users collection:');
        indexes.forEach(idx => {
            console.log(`   - ${JSON.stringify(idx.key)}  name="${idx.name}"  unique=${!!idx.unique}`);
        });

        // Find the phone unique index
        const phoneIndex = indexes.find(idx =>
            idx.key && idx.key.phone !== undefined && idx.unique === true
        );

        if (!phoneIndex) {
            console.log('\n✅ No unique index on `phone` found — nothing to drop.');
            process.exit(0);
        }

        console.log(`\n🗑️  Dropping index: "${phoneIndex.name}"...`);
        await collection.dropIndex(phoneIndex.name);
        console.log('✅ Phone unique index dropped successfully.');
        console.log('\nUsers can now register multiple accounts with the same phone number.');
        console.log('(Application-level rule: max 3 accounts per phone number still enforced in code.)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
};

dropPhoneIndex();
