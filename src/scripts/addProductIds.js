import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migration script to add productId to existing products
 */
async function addProductIds() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Find all products without productId
        const products = await Product.find({
            $or: [
                { productId: { $exists: false } },
                { productId: null },
                { productId: '' }
            ]
        }).sort({ createdAt: 1 });

        console.log(`Found ${products.length} products without productId`);

        let count = 0;
        for (const product of products) {
            const year = new Date(product.createdAt || new Date()).getFullYear();
            const existingCount = await Product.countDocuments({
                productId: { $exists: true, $ne: null, $ne: '' }
            });

            product.productId = `PRD-${year}-${String(existingCount + count + 1).padStart(5, '0')}`;
            await product.save();
            count++;
            console.log(`✓ Added productId ${product.productId} to ${product.productName}`);
        }

        console.log(`\n✅ Migration complete! Added productId to ${count} products.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

addProductIds();
