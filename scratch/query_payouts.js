import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        const uri = process.env.MONGO_URI.replace('sarvasolution_test_db', 'sarvasolution_t_main_db');
        await mongoose.connect(uri);
        console.log("Connected to DB: sarvasolution_t_main_db");

        const memberIds = ['SVS46321802', 'SVS23286132', 'SVS000001'];
        const db = mongoose.connection.db;

        const payouts = await db.collection('payouts').find({
            memberId: { $in: memberIds },
            $or: [ { netAmount: 475 }, { amount: 475 } ]
        }).toArray();

        console.log(JSON.stringify(payouts, null, 2));

    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
