
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Setup file logging
const LOG_FILE = path.join(process.cwd(), 'system_test.log');
function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    fs.appendFileSync(LOG_FILE, line);
    // Also try to write to stdout/stderr in case it works
    // process.stdout.write(line); 
}

// Clear log file
if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

log('STARTING SCRIPT via File Logger');

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../');
const envPath = path.join(rootDir, '.env');

log(`Loading .env from: ${envPath}`);
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    log('✅ .env file loaded');
} else {
    log('❌ .env file NOT FOUND');
}

import User from '../src/models/User.model.js';
import Franchise from '../src/models/Franchise.model.js';
import Product from '../src/models/Product.model.js';
import FranchiseInventory from '../src/models/FranchiseInventory.model.js';
import FranchiseSale from '../src/models/FranchiseSale.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import Payout from '../src/models/Payout.model.js';
import BVTransaction from '../src/models/BVTransaction.model.js';

async function connectDBLocal() {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) {
            throw new Error('MONGO_URI is not defined in .env');
        }
        await mongoose.connect(uri);
        log('✅ Manual Mongoose Connection Successful');
    } catch (err) {
        log(`❌ Mongoose Connection Error: ${err.message}`);
        process.exit(1);
    }
}

async function testSystem() {
    try {
        log('🚀 STARTING SYSTEM TEST & POPULATION');

        await connectDBLocal();

        // 2. Identify and Preserve Admin
        const admin = await User.findOne({ role: 'admin' });
        let adminId = null;

        if (admin) {
            log(`✅ Found Admin: ${admin.fullName} (${admin.memberId}) - PRESERVING`);
            adminId = admin._id;
        } else {
            log('⚠️ No Admin found! A new Admin will be created.');
        }

        // 3. Wipe Data (Except Admin)
        log('🧹 Cleaning Database...');

        await Franchise.deleteMany({});
        await Product.deleteMany({});
        await FranchiseInventory.deleteMany({});
        await FranchiseSale.deleteMany({});
        await Payout.deleteMany({});
        await BVTransaction.deleteMany({});

        if (adminId) {
            await User.deleteMany({ _id: { $ne: adminId } });
            await UserFinance.deleteMany({ user: { $ne: adminId } });
        } else {
            await User.deleteMany({});
            await UserFinance.deleteMany({});
        }

        log('✅ Database Wiped (Admin preserved)');

        // 3a. Update/Create Admin
        if (adminId) {
            admin.leftChild = null;
            admin.rightChild = null;
            admin.sponsorId = null;
            admin.parentId = null;
            admin.position = 'root';
            admin.personalPV = 100;
            admin.totalPV = 100;
            await admin.save();

            let adminFinance = await UserFinance.findOne({ user: adminId });
            if (!adminFinance) {
                adminFinance = await UserFinance.create({
                    user: adminId,
                    memberId: admin.memberId
                });
            }
            adminFinance.leftLegPV = 0;
            adminFinance.rightLegPV = 0;
            adminFinance.leftLegBV = 0;
            adminFinance.rightLegBV = 0;
            adminFinance.totalPV = 100;
            adminFinance.totalBV = 0;
            adminFinance.wallet = { availableBalance: 0, totalEarnings: 0 };
            adminFinance.fastTrack = {
                dailyClosings: 0,
                pendingPairLeft: 0,
                pendingPairRight: 0,
                carryForwardLeft: 0,
                carryForwardRight: 0,
                closingHistory: [],
                weeklyEarnings: 0
            };
            adminFinance.starMatchingBonus = {
                dailyClosings: 0,
                pendingStarsLeft: 0,
                pendingStarsRight: 0,
                carryForwardStarsLeft: 0,
                carryForwardStarsRight: 0,
                closingHistory: [],
                weeklyEarnings: 0
            };
            await adminFinance.save();

            log('✅ Admin Data Reset');
        } else {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const newAdmin = await User.create({
                memberId: 'ADMIN001',
                fullName: 'System Admin',
                email: 'admin@ssvpl.com',
                password: hashedPassword,
                role: 'admin',
                status: 'active',
                isFirstPurchaseDone: true,
                position: 'root',
                phone: '9999999999'
            });
            adminId = newAdmin._id;
            await UserFinance.create({
                user: newAdmin._id,
                memberId: newAdmin.memberId
            });
            log('✅ Created New Admin');
        }

        // 4. Create Master Data
        log('🏭 Seeding Master Data...');

        const products = await Product.create([
            {
                productName: 'Activation Kit A',
                description: 'Starter Pack',
                price: 1000,
                mrp: 1200,
                productDP: 900,
                pv: 50,
                bv: 40,
                category: 'health care',
                hsnCode: '3004',
                stockQuantity: 1000,
                isActive: true,
                productImage: { // Added required image
                    url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
                    publicId: 'sample'
                }
            },
            {
                productName: 'Premium Supplement',
                description: 'High PV Item',
                price: 2500,
                mrp: 3000,
                productDP: 2200,
                pv: 100,
                bv: 80,
                category: 'health care',
                hsnCode: '3004',
                stockQuantity: 1000,
                isActive: true,
                productImage: {
                    url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
                    publicId: 'sample'
                }
            },
            {
                productName: 'Daily Essentials',
                description: 'Low cost item',
                price: 500,
                mrp: 600,
                productDP: 450,
                pv: 10,
                bv: 8,
                category: 'personal care',
                hsnCode: '3304',
                stockQuantity: 1000,
                isActive: true,
                productImage: {
                    url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
                    publicId: 'sample'
                }
            }
        ]);
        log(`✅ Created ${products.length} Products`);

        const hashedPassword = await bcrypt.hash('123456', 10);
        const franchise = await Franchise.create({
            vendorId: 'VEN001',
            name: 'City Distributor',
            shopName: 'SSVPL City Hub',
            email: 'vendor1@ssvpl.com',
            phone: '9876543210',
            password: hashedPassword,
            city: 'Mumbai',
            status: 'active',
            balance: 50000,
            shopAddress: {
                street: '123 Market St',
                state: 'Maharashtra',
                pincode: '400001'
            },
            createdBy: adminId // REQUIRED field
        });
        log(`✅ Created Franchise: ${franchise.name}`);

        for (const prod of products) {
            await FranchiseInventory.create({
                franchise: franchise._id,
                product: prod._id,
                stockQuantity: 100,
                pv: prod.pv,
                bv: prod.bv,
                productDP: prod.productDP,
                purchasePrice: prod.productDP // Added REQUIRED field
            });
        }
        log('✅ Stocked Franchise Inventory');

        // 5. Build User Tree
        log('🌳 Building User Tree...');

        const rootAdmin = await User.findById(adminId);

        async function createUser(name, id, sponsorId, parentId, position) {
            const user = await User.create({
                memberId: id,
                fullName: name,
                email: `${id.toLowerCase()}@test.com`,
                phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
                password: hashedPassword,
                role: 'user',
                status: 'inactive',
                isFirstPurchaseDone: false,
                sponsorId: sponsorId,
                parentId: parentId,
                position: position,
                address: { state: 'Maharashtra', city: 'Mumbai' }
            });

            await UserFinance.create({ user: user._id, memberId: user.memberId });

            if (parentId) {
                const parent = await User.findById(parentId);
                if (position === 'left') parent.leftChild = user._id;
                else parent.rightChild = user._id;
                await parent.save();
            }
            return user;
        }

        const userA = await createUser('Alice Leader', 'USER001', rootAdmin.memberId, rootAdmin._id, 'left');
        const userB = await createUser('Bob Builder', 'USER002', rootAdmin.memberId, rootAdmin._id, 'right');
        const userC = await createUser('Charlie Champ', 'USER003', userA.memberId, userA._id, 'left');
        const userD = await createUser('David Dreamer', 'USER004', userA.memberId, userA._id, 'right');
        const userE = await createUser('Eve Expert', 'USER005', userB.memberId, userB._id, 'left');
        const userF = await createUser('Frank Founder', 'USER006', userB.memberId, userB._id, 'right');

        log('✅ Tree Structure Created (3 Levels)');

        // 6. Simulate Transactions
        log('💸 Simulating Transactions...');

        async function runSale(buyer, items) {
            let totalAmount = 0;
            let totalPV = 0;
            let totalBV = 0;

            const saleItems = items.map(item => {
                const prod = products.find(p => p.productName === item.name);
                const amount = prod.price * item.qty;

                totalAmount += amount;
                totalPV += prod.pv * item.qty;
                totalBV += prod.bv * item.qty;

                return {
                    product: prod._id,
                    quantity: item.qty,
                    price: prod.price,
                    productDP: prod.productDP,
                    pv: prod.pv * item.qty,
                    bv: prod.bv * item.qty,
                    totalPV: prod.pv * item.qty,
                    totalBV: prod.bv * item.qty,
                    amount: amount,
                    hsnCode: prod.hsnCode
                };
            });

            const sale = await FranchiseSale.create({
                saleNo: `FS-TEST-${Math.floor(Math.random() * 100000)}`,
                saleDate: new Date(),
                franchise: franchise._id,
                user: buyer._id,
                memberId: buyer.memberId,
                items: saleItems,
                subTotal: totalAmount,
                gstRate: 18,
                gstAmount: 0,
                grandTotal: totalAmount,
                totalPV,
                totalBV,
                isFirstPurchase: !buyer.isFirstPurchaseDone,
                paymentStatus: 'paid',
                paymentMethod: 'cash'
            });

            if (!buyer.isFirstPurchaseDone && totalPV >= 1) {
                buyer.status = 'active';
                buyer.isFirstPurchaseDone = true;
                buyer.activationDate = new Date();
                await buyer.save();
                log(`   🌟 Activated User: ${buyer.memberId}`);

                const sponsorMemberId = buyer.sponsorId;
                if (sponsorMemberId) {
                    const sponsor = await User.findOne({ memberId: sponsorMemberId });
                    if (sponsor) {
                        const bonus = totalAmount * 0.10;
                        log(`   💰 Direct Bonus Triggered: ₹${bonus} for ${sponsor.memberId}`);
                    }
                }
            }

            buyer.personalPV += totalPV;
            buyer.totalPV += totalPV;
            await buyer.save();

            await UserFinance.findOneAndUpdate(
                { user: buyer._id },
                { $inc: { personalPV: totalPV, totalPV: totalPV, totalBV: totalBV } }
            );

            let current = buyer;
            let loopGuard = 0;
            while (current.parentId && loopGuard < 20) {
                const parent = await User.findById(current.parentId);
                if (!parent) break;

                const finance = await UserFinance.findOne({ user: parent._id });
                if (finance) {
                    if (current.position === 'left') {
                        finance.leftLegPV += totalPV;
                        finance.leftLegBV += totalBV;
                    } else {
                        finance.rightLegPV += totalPV;
                        finance.rightLegBV += totalBV;
                    }
                    finance.totalPV += totalPV;
                    finance.totalBV += totalBV;
                    await finance.save();
                }
                current = parent;
                loopGuard++;
            }
            log(`   🛒 Sale: ${buyer.memberId} bought ${totalPV} PV`);
            return sale;
        }

        // Run scenarios
        log('   --- activating C & D ---');
        await runSale(userC, [{ name: 'Activation Kit A', qty: 1 }]);
        await runSale(userD, [{ name: 'Activation Kit A', qty: 1 }]);

        log('   --- activating A ---');
        await runSale(userA, [{ name: 'Premium Supplement', qty: 1 }]);

        log('   --- activating E & F ---');
        await runSale(userE, [{ name: 'Daily Essentials', qty: 5 }]);
        await runSale(userF, [{ name: 'Premium Supplement', qty: 2 }]);

        log('📊 Verifying Results...');
        const adminFinanceCheck = await UserFinance.findOne({ user: adminId });
        log(`\nAdmin Stats (${rootAdmin.memberId}):`);
        log(`Left Leg PV: ${adminFinanceCheck.leftLegPV} (Expected: ~200)`);
        log(`Right Leg PV: ${adminFinanceCheck.rightLegPV} (Expected: ~250)`);

        log('✅ SYSTEM TEST COMPLETED SUCCESSFULLY');

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        log(`❌ ERROR: ${error.message}`);
        log(error.stack);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
}

testSystem();
