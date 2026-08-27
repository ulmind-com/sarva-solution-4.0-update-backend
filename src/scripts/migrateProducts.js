import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.model.js';

dotenv.config();

const migrateProducts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Connected to MongoDB for Migration');

        const products = await Product.find({});
        console.log(`Found ${products.length} products to migrate.`);

        for (const product of products) {
            let updated = false;

            // 1. Set default Inventory
            if (product.stockQuantity === undefined) {
                product.stockQuantity = 0;
                updated = true;
            }

            // 2. Set default HSN if missing
            if (!product.hsnCode) {
                product.hsnCode = '999999'; // Temporary placeholder
                updated = true;
            }

            // 3. Set default Category if invalid/missing
            const validCategories = [
                'aquaculture', 'agriculture', 'personal care',
                'health care', 'home care', 'luxury goods'
            ];
            if (!product.category || !validCategories.includes(product.category)) {
                // Map old 'segment' field if it exists, or default
                if (product.segment && validCategories.includes(product.segment)) {
                    product.category = product.segment;
                } else {
                    product.category = 'aquaculture'; // Default fallback
                }
                updated = true;
            }

            // 4. Ensure PV/BV exist
            if (product.bv === undefined) { product.bv = 0; updated = true; }
            if (product.pv === undefined) { product.pv = 0; updated = true; }

            // 5. Generate SKU if missing
            if (!product.sku) {
                const categoryCode = product.category.substring(0, 3).toUpperCase();
                const uniqueStr = Math.random().toString(36).substring(2, 7).toUpperCase();
                product.sku = `SSVPL-${categoryCode}-${uniqueStr}`;
                updated = true;
            }

            if (updated) {
                await product.save({ validateBeforeSave: false }); // Skip strict validation for migration
                console.log(`✅ Migrated Product: ${product.productName || product.name || 'Unnamed'}`);
            }
        }

        console.log('🎉 Migration Completed Successfully');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
};

migrateProducts();
