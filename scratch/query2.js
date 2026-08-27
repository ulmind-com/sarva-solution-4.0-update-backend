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

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const memberIds = ['SVS46321802', 'SVS23286132', 'SVS000001'];
        
        console.log("=== Users ===");
        const users = await User.find({ memberId: { $in: memberIds } });
        console.log(users.map(u => u.memberId));

        console.log("\n=== Checking with regex in case of trailing spaces ===");
        const regexUsers = await User.find({ memberId: { $regex: 'SVS46321802|SVS23286132|SVS000001', $options: 'i' } });
        console.log(regexUsers.map(u => ({ id: u._id, memberId: u.memberId, name: u.firstName + " " + u.lastName })));

        const regexMemberIds = regexUsers.map(u => u.memberId);
        
        const finances = await UserFinance.find({
            memberId: { $in: regexMemberIds }
        });
        
        for (const f of finances) {
            console.log(`\nTransactions for ${f.memberId}:`);
            const targetTx = f.transactions.filter(t => t.amount === 475);
            if (targetTx.length > 0) {
                 console.log("Found 475 transactions:", JSON.stringify(targetTx, null, 2));
            } else {
                 console.log("No 475 transaction found. Last 5 transactions:");
                 console.log(JSON.stringify(f.transactions.slice(-5), null, 2));
            }
        }
        
    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
