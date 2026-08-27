import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const userSchema = new mongoose.Schema({
    memberId: { type: String, required: true, index: true },
    firstName: String,
    lastName: String
}, { timestamps: true, strict: false });
const User = mongoose.models.User || mongoose.model('User', userSchema);

const userFinanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: String, required: true, index: true },
    walletBalance: { type: Number, default: 0 },
    transactions: [{
        amount: { type: Number, required: true },
        type: { type: String, enum: ['Credit', 'Debit'], required: true },
        description: { type: String },
        referenceId: { type: String },
        date: { type: Date, default: Date.now }
    }],
}, { timestamps: true, strict: false });
const UserFinance = mongoose.models.UserFinance || mongoose.model('UserFinance', userFinanceSchema);

const walletAdjustmentLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: String, required: true, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['Credit', 'Debit'], required: true },
    amount: { type: Number, required: true, min: 1 },
    previousBalance: { type: Number, required: true },
    newBalance: { type: Number, required: true },
    remarks: { type: String },
}, { timestamps: true, strict: false });
const WalletAdjustmentLog = mongoose.models.WalletAdjustmentLog || mongoose.model('WalletAdjustmentLog', walletAdjustmentLogSchema);

async function run() {
    try {
        const uri = process.env.MONGO_URI.replace('sarvasolution_test_db', 'sarvasolution_t_main_db');
        await mongoose.connect(uri);
        console.log("Connected to DB: sarvasolution_t_main_db");

        const memberIds = ['SVS46321802', 'SVS23286132', 'SVS000001'];
        
        console.log("\n=== Wallet Adjustment Logs ===");
        const logs = await WalletAdjustmentLog.find({ memberId: { $in: memberIds }, amount: 475 });
        console.log(JSON.stringify(logs, null, 2));

        console.log("\n=== Any transactions of 475 in UserFinance ===");
        const finances = await UserFinance.find({ memberId: { $in: memberIds } });
        
        for (const f of finances) {
            console.log(`\nTransactions for ${f.memberId}:`);
            const targetTx = f.transactions.filter(t => t.amount === 475);
            if (targetTx.length > 0) {
                 console.log("Found 475 transactions:", JSON.stringify(targetTx, null, 2));
            } else {
                 console.log("No 475 transaction found. Here are the last 5 transactions:");
                 console.log(JSON.stringify(f.transactions.slice(-5), null, 2));
            }
            
            // Wait, also check transactions happening on May 1 2026.
            const may1Tx = f.transactions.filter(t => t.date.toISOString().startsWith('2026-05-01'));
            if (may1Tx.length > 0) {
                 console.log(`Transactions on May 1 for ${f.memberId}:`, JSON.stringify(may1Tx, null, 2));
            }
        }

    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
