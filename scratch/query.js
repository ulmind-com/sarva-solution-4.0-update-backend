import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const walletAdjustmentLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: String, required: true, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['Credit', 'Debit'], required: true },
    amount: { type: Number, required: true, min: 1 },
    previousBalance: { type: Number, required: true },
    newBalance: { type: Number, required: true },
    remarks: { type: String },
}, { timestamps: true });

const WalletAdjustmentLog = mongoose.models.WalletAdjustmentLog || mongoose.model('WalletAdjustmentLog', walletAdjustmentLogSchema);

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
}, { timestamps: true });
const UserFinance = mongoose.models.UserFinance || mongoose.model('UserFinance', userFinanceSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const memberIds = ['SVS46321802', 'SVS23286132', 'SVS000001'];

        console.log("=== Wallet Adjustment Logs ===");
        const logs = await WalletAdjustmentLog.find({
            memberId: { $in: memberIds },
            amount: 475
        });
        console.log(JSON.stringify(logs, null, 2));

        console.log("\n=== User Finance Transactions on May 1 2026 ===");
        const startDate = new Date('2026-05-01T00:00:00.000Z');
        const endDate = new Date('2026-05-01T23:59:59.999Z');

        const finances = await UserFinance.find({
            memberId: { $in: memberIds }
        });
        
        for (const f of finances) {
            console.log(`\nTransactions for ${f.memberId}:`);
            const targetTx = f.transactions.filter(t => t.amount === 475);
            console.log(JSON.stringify(targetTx, null, 2));
            
            const may1Tx = f.transactions.filter(t => t.date >= startDate && t.date <= endDate);
            console.log(`\nAll transactions on May 1 for ${f.memberId}:`);
            console.log(JSON.stringify(may1Tx, null, 2));
        }

    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
