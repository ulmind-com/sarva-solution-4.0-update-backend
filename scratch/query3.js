import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

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

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const startDate = new Date('2026-05-01T00:00:00.000Z');
        const endDate = new Date('2026-05-01T23:59:59.999Z');

        const allFinances = await UserFinance.find({});
        console.log(`Found ${allFinances.length} user finance records total.`);
        
        let found = 0;
        for (const f of allFinances) {
            const todaysTx = f.transactions.filter(t => t.date >= startDate && t.date <= endDate);
            if (todaysTx.length > 0) {
                console.log(`\nToday's tx for ${f.memberId}:`);
                console.log(JSON.stringify(todaysTx, null, 2));
                found++;
            }
        }
        console.log(`Found ${found} users with transactions today.`);

    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
