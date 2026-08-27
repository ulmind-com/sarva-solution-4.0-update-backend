import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.model.js';

dotenv.config();

const sampleProducts = [
    {
        productName: "Premium Fish Friend Feed",
        description: "High-protein formulated feed for rapid fish growth and immunity boosting. Suitable for all freshwater species.",
        price: 2500,
        mrp: 3000,
        bv: 1000,
        pv: 100,
        hsnCode: "230990",
        category: "aquaculture",
        stockQuantity: 500,
        productImage: {
            url: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
            publicId: "sample_fish_feed"
        },
        isActive: true,
        isApproved: true,
        batchNo: "BATCH2026-001"
    },
    {
        productName: "Organic Growth Booster",
        description: "100% Organic plant growth promoter. Increases yield by 30%. Non-toxic and safe for all crops.",
        price: 1200,
        mrp: 1500,
        bv: 500,
        pv: 50,
        hsnCode: "310100",
        category: "agriculture",
        stockQuantity: 1000,
        productImage: {
            url: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
            publicId: "sample_growth_booster"
        },
        isActive: true,
        isApproved: true,
        batchNo: "BATCH2026-002"
    },
    {
        productName: "Luxury Herbal Soap Kit",
        description: "Set of 5 premium herbal soaps. Enriched with Aloe Vera and Neem for glowing skin.",
        price: 999,
        mrp: 1299,
        bv: 300,
        pv: 30,
        hsnCode: "340111",
        category: "personal care",
        stockQuantity: 200,
        productImage: {
            url: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
            publicId: "sample_soap_kit"
        },
        isActive: true,
        isApproved: true,
        batchNo: "BATCH2026-003"
    }
];

const seedProducts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🌱 Connected to MongoDB for Seeding');

        // Check if products exist to avoid cleanup in production-like dev
        const count = await Product.countDocuments();
        if (count > 0) {
            console.log('⚠️ Products already exist. Skipping deletion to preserve data.');
        } else {
            console.log('🧹 Cleaning up old products...');
            await Product.deleteMany({});
        }

        console.log('🚀 Seeding new products...');
        for (const prod of sampleProducts) {
            // Create using model to trigger virtuals and pre-save hooks (SKU generation)
            await Product.create(prod);
        }

        console.log('✅ Seeding Completed Successfully');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    }
};

seedProducts();
