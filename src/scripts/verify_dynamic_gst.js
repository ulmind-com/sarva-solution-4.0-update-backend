import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Franchise from '../models/Franchise.model.js';
import User from '../models/User.model.js';
import Product from '../models/Product.model.js';
import FranchiseInventory from '../models/FranchiseInventory.model.js';
import FranchiseSale from '../models/FranchiseSale.model.js'; // Import explicitly
import connectDB from '../config/db.js';
import { sellToUser } from '../controllers/franchise/sale.controller.js';

dotenv.config();

const mockReq = (body, franchiseId) => ({
    body,
    franchise: { _id: franchiseId },
    params: {}
});

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

const verifyDynamicGST = async () => {
    try {
        await connectDB();
        console.log('DB Connected.');

        // 1. Create Data
        const suffix = Date.now();
        console.log(`Creating test data with suffix: ${suffix}`);

        // Franchise (West Bengal)
        const franchiseOwner = await User.create({
            memberId: `FRA-OWNER-${suffix}`,
            username: `fraowner${suffix}`,
            email: `fraowner${suffix}@test.com`,
            password: 'password',
            fullName: 'Franchise Owner',
            phone: '6666666666',
            role: 'franchise_owner',
            address: { state: 'West Bengal' }
        });

        const franchise = await Franchise.create({
            franchiseId: `TEST-FRA-${suffix}`,
            vendorId: `VEN-${suffix}`, // Required Field
            name: 'Test Franchise',
            shopName: 'Test Shop',
            email: `fra${suffix}@test.com`,
            password: 'password',
            phone: '9999999999',
            shopAddress: {
                level: 'Store', // Address schema likely needs level or similar if strictly validated, but usually not strict. 
                // Checking address schema in next step if this fails, but basic fields should work.
                state: 'West Bengal',
                street: 'Test St',
                city: 'Kolkata',
                pincode: '700001'
            },
            city: 'Kolkata',
            state: 'West Bengal',
            area: 'Test Area',
            pincode: '700001',
            status: 'active',
            createdBy: franchiseOwner._id // Required Field
        });

        // User (Intra-state: West Bengal)
        const userIntra = await User.create({
            memberId: `MEM-INTRA-${suffix}`,
            username: `userintra${suffix}`,
            email: `intra${suffix}@test.com`,
            password: 'password',
            fullName: 'Intra User',
            phone: '8888888888',
            address: { state: 'West Bengal' },
            role: 'user',
            isFirstPurchaseDone: true // Repurchase mode for simplicity
        });

        // User (Inter-state: Odisha)
        const userInter = await User.create({
            memberId: `MEM-INTER-${suffix}`,
            username: `userinter${suffix}`,
            email: `inter${suffix}@test.com`,
            password: 'password',
            fullName: 'Inter User',
            phone: '7777777777',
            address: { state: 'Odisha' },
            role: 'user',
            isFirstPurchaseDone: true
        });

        // Product (18% GST: 9% CGST, 9% SGST)
        const product = await Product.create({
            productName: 'Test Product',
            productId: `PRD-${suffix}`,
            description: 'Test',
            price: 100, // Base Price
            mrp: 118,
            productDP: 100,
            category: 'health care',
            cgst: 9,
            sgst: 9,
            stockQuantity: 1000,
            productImage: { url: 'http://test.com', publicId: 'test' }
        });

        // Add Inventory
        await FranchiseInventory.create({
            franchise: franchise._id,
            product: product._id,
            stockQuantity: 100
        });

        console.log('Test Data Created. Starting Verification...');

        // --- TEST 1: Intra-State Sale (WB -> WB) ---
        console.log('\n--- Test 1: Intra-State Sale ---');
        const req1 = mockReq({
            memberId: userIntra.memberId,
            items: [{ productId: product._id, quantity: 2 }]
        }, franchise._id);
        const res1 = mockRes();

        // We can't directly call the controller function easily because it imports models internally which we already have, 
        // but it should work if we import the controller function.
        // However, the controller uses `import ... from ...` so we need to ensure this script is module type.
        // The project is type: module, so it should work.

        await sellToUser(req1, res1);

        if (res1.statusCode !== 201) {
            console.error('Test 1 Failed:', res1.data);
        } else {
            const sale = res1.data.data.sale;
            const item = sale.items[0];
            console.log('Sale Created:', sale.saleNo);
            console.log(`SubTotal: ${sale.subTotal} (Expected: 200)`);
            console.log(`CGST Rate: ${item.cgstRate} (Expected: 9)`);
            console.log(`SGST Rate: ${item.sgstRate} (Expected: 9)`);
            console.log(`IGST Rate: ${item.igstRate} (Expected: 0)`);
            console.log(`Tax Amount: ${item.taxAmount} (Expected: 36)`); // 200 * 18% = 36
            console.log(`Grand Total: ${sale.grandTotal} (Expected: 236)`);

            if (item.cgstRate === 9 && item.sgstRate === 9 && item.igstRate === 0 && sale.grandTotal === 236) {
                console.log('✅ Intra-State Calculation Correct');
            } else {
                console.error('❌ Intra-State Calculation Incorrect');
            }
        }

        // --- TEST 2: Inter-State Sale (WB -> Odisha) ---
        console.log('\n--- Test 2: Inter-State Sale ---');
        const req2 = mockReq({
            memberId: userInter.memberId,
            items: [{ productId: product._id, quantity: 2 }]
        }, franchise._id);
        const res2 = mockRes();

        await sellToUser(req2, res2);

        if (res2.statusCode !== 201) {
            console.error('Test 2 Failed:', res2.data);
        } else {
            const sale = res2.data.data.sale;
            const item = sale.items[0];
            console.log('Sale Created:', sale.saleNo);
            console.log(`SubTotal: ${sale.subTotal} (Expected: 200)`);
            console.log(`CGST Rate (Source): ${item.cgstRate} (Expected: 9)`);
            console.log(`SGST Rate (Source): ${item.sgstRate} (Expected: 9)`);
            // igstRate removed from schema
            console.log(`Tax Amount: ${item.taxAmount} (Expected: 36)`);
            console.log(`Grand Total: ${sale.grandTotal} (Expected: 236)`);

            if (item.cgstRate === 9 && item.sgstRate === 9 && item.taxAmount === 36 && sale.grandTotal === 236) {
                console.log('✅ Inter-State Calculation Correct');
            } else {
                console.error('❌ Inter-State Calculation Incorrect');
            }
        }

        // Cleanup
        console.log('\nCleaning up...');
        await Franchise.deleteOne({ _id: franchise._id });
        await User.deleteMany({ _id: { $in: [userIntra._id, userInter._id] } });
        await Product.deleteOne({ _id: product._id });
        await FranchiseInventory.deleteMany({ franchise: franchise._id });
        // Keeping sales for debugging if needed, or delete:
        // await FranchiseSale.deleteMany({ franchise: franchise._id }); 

        console.log('Done.');
        process.exit(0);

    } catch (error) {
        console.error('Verification Error:', error);
        process.exit(1);
    }
};

verifyDynamicGST();
