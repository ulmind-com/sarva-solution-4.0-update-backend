import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import Franchise from '../models/Franchise.model.js';
import Product from '../models/Product.model.js';
import { processSaleTransaction } from '../services/business/sales.service.js';

dotenv.config();

const verifyAdminSale = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('DB Connected');

        // 1. Get Admin
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) throw new Error('Admin not found');
        console.log('Admin:', admin.email);

        // 2. Get Franchise (or create mock)
        let franchise = await Franchise.findOne();
        if (!franchise) {
            console.log('No franchise found. Please create one first or run this in an env with data.');
            process.exit(1);
        }
        console.log('Franchise:', franchise.name, 'State:', franchise.shopAddress?.state);

        // 3. Get Product (or create)
        let product = await Product.findOne({ stockQuantity: { $gt: 10 } });
        if (!product) {
            product = await Product.create({
                productId: `TEST-${Date.now()}`,
                productName: 'Test Product GST',
                category: 'Health',
                price: 100, // DP
                mrp: 150,
                stockQuantity: 100,
                cgst: 9,
                sgst: 9,
                isActive: true
            });
            console.log('Created Test Product');
        }
        console.log('Product:', product.productName, 'Price:', product.price, 'CGST:', product.cgst, 'SGST:', product.sgst);

        // 4. Run Transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        const result = await processSaleTransaction({
            items: [{ productId: product._id, quantity: 2 }],
            franchise,
            invoiceDate: new Date(),
            session,
            user: admin
        });

        await session.commitTransaction();
        session.endSession();

        console.log('\n--- Transaction Result ---');
        console.log('Invoice No:', result.invoice.invoiceNo);
        console.log('SubTotal (Taxable):', result.invoice.subTotal);
        console.log('Total Tax:', result.invoice.gstAmount);
        console.log('Grand Total:', result.invoice.grandTotal);
        console.log('CGST Total:', result.invoice.totalCGST);
        console.log('SGST Total:', result.invoice.totalSGST);
        console.log('IGST Total:', result.invoice.totalIGST);

        console.log('\n--- PDF Output Mock ---');
        console.log('PDF Totals:', result.totals);

        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

verifyAdminSale();
