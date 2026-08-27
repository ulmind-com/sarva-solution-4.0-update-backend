
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import path from 'path';

// Models
import User from '../src/models/User.model.js';
import Franchise from '../src/models/Franchise.model.js';
import Product from '../src/models/Product.model.js';
import ProductRequest from '../src/models/ProductRequest.model.js';
import FranchiseInventory from '../src/models/FranchiseInventory.model.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to DB');
    } catch (error) {
        console.error('DB Connection Failed:', error);
        process.exit(1);
    }
};

const runTest = async () => {
    await connectDB();

    try {
        // 1. Get Franchise and Product
        const franchise = await Franchise.findOne({ vendorId: 'FS202600001' }); // City Distributor
        const product = await Product.findOne({ stockQuantity: { $gt: 100 } });
        const admin = await User.findOne({ role: 'admin' });

        if (!franchise || !product || !admin) {
            console.error('❌ Missing Test Data');
            process.exit(1);
        }

        console.log(`\n--- Test Data ---`);
        console.log(`Franchise: ${franchise.name} (${franchise._id})`);
        console.log(`Product: ${product.productName} (Stock: ${product.stockQuantity})`);

        // 2. Mock Request Creation (Simulating Controller Logic)
        console.log(`\n--- 1. Creating Request (Simulating POST /request/create) ---`);

        // Simulating the request creation logic directly
        const requestItems = [{
            product: product._id,
            requestedQuantity: 10,
            productDP: product.price,
            productMRP: product.mrp,
            hsnCode: product.hsnCode
        }];

        const request = await ProductRequest.create({
            requestNo: `TEST-REQ-${Date.now()}`,
            franchise: franchise._id,
            franchiseGSTIN: 'TESTGST',
            items: requestItems,
            estimatedTotal: product.price * 10,
            status: 'pending'
        });

        console.log(`✅ Request Created: ${request.requestNo} (${request._id})`);

        // 3. Mock Admin List (Simulating GET /request/list)
        console.log(`\n--- 2. Listing Requests (Simulating GET /request/list) ---`);
        const list = await ProductRequest.find({ status: 'pending' });
        console.log(`✅ Pending Requests Found: ${list.length}`);


        // 4. Mock Admin Approval (Simulating PATCH /request/:id/approve)
        console.log(`\n--- 3. Approving Request (Simulating PATCH /request/${request._id}/approve) ---`);

        // Importing Service Logic logic?
        // We can just call the Service directly if we import it, OR replicate the logic to verify "It Works"
        // Let's rely on the fact that we verified the service code. 
        // We will call the actual Service function `processSaleTransaction` if possible, 
        // but it requires complex imports. 
        // Instead, let's just assume the service works (verified earlier) and check checks.

        // Actually, to be SURE, let's try to call the Service.
        const { processSaleTransaction, handlePostSaleActions } = await import('../src/services/business/sales.service.js');

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Logic from admin/request.controller.js
            const salesItems = [{ productId: product._id, quantity: 10 }];

            // Deduct Admin Stock
            const result = await processSaleTransaction({
                items: salesItems,
                franchise: franchise,
                invoiceDate: new Date(),
                session,
                user: admin
            });

            request.status = 'approved';
            request.approvedBy = admin._id;
            request.approvedAt = new Date();
            request.invoiceId = result.invoice._id;
            await request.save({ session });

            await session.commitTransaction();
            console.log('✅ Transaction Committed (Stock Deducted, Invoice Created)');

            // Post Actions (Inventory Add)
            // Note: processSaleTransaction adds to inventory? 
            // Wait, processSaleTransaction DOES add to Franchise Inventory (Line 73 in sales.service.js).
            // Let's verify that.

        } catch (e) {
            await session.abortTransaction();
            console.error('❌ Approval Failed:', e);
            throw e;
        } finally {
            session.endSession();
        }

        // 5. Verify Final State
        console.log(`\n--- 4. Final Verification ---`);

        const updatedProduct = await Product.findById(product._id);
        const franchiseStock = await FranchiseInventory.findOne({ franchise: franchise._id, product: product._id });
        const updatedRequest = await ProductRequest.findById(request._id);

        console.log(`Admin Product Stock: ${updatedProduct.stockQuantity} (Expected: ${product.stockQuantity - 10})`);
        console.log(`Franchise Inventory: ${franchiseStock ? franchiseStock.stockQuantity : 0} (Expected: >= 10)`);
        console.log(`Request Status: ${updatedRequest.status}`);

        if (updatedProduct.stockQuantity === product.stockQuantity - 10 && updatedRequest.status === 'approved') {
            console.log(`\n✅ SUCCESS: Full Request Cycle Works!`);
        } else {
            console.log(`\n❌ FAILURE: Logic Mismatch.`);
        }

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        await mongoose.disconnect();
    }
};

runTest();
