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

        const collections = await db.listCollections().toArray();

        for (const c of collections) {
            const collection = db.collection(c.name);
            
            // Search for memberIds and amount 475
            const docs = await collection.find({
                $and: [
                    { $or: [ { memberId: { $in: memberIds } }, { user: { $exists: true } } ] },
                    { $or: [
                        { 'transactions.amount': 475 },
                        { amount: 475 },
                        { netAmount: 475 },
                        { totalAmount: 475 },
                        { amountCredited: 475 },
                        { amountDebited: 475 }
                    ]}
                ]
            }).toArray();

            // Filter manually if needed
            const relevantDocs = docs.filter(d => {
                const str = JSON.stringify(d);
                return (memberIds.includes(d.memberId) || str.includes('SVS46321802') || str.includes('SVS23286132') || str.includes('SVS000001')) && str.includes('475');
            });

            if (relevantDocs.length > 0) {
                 console.log(`\n=== Found 475 in Collection: ${c.name} ===`);
                 for(let doc of relevantDocs) {
                     if (doc.transactions) {
                         const txs = doc.transactions.filter(t => t.amount === 475);
                         console.log(`Transactions for ${doc.memberId || doc._id}:`, txs);
                     } else {
                         console.log(`Doc ID: ${doc._id}, memberId: ${doc.memberId}, amount: ${doc.amount || doc.netAmount || doc.totalAmount}, date: ${doc.createdAt || doc.date || doc.updatedAt}`);
                     }
                 }
            }
        }
        
        // Also check Admin Wallet logs for amount 475
        console.log("\n=== Checking ALL records with 475 ===");
        for (const c of collections) {
            const collection = db.collection(c.name);
            const docs = await collection.find({
                 $or: [
                        { 'transactions.amount': 475 },
                        { amount: 475 },
                        { netAmount: 475 },
                        { totalAmount: 475 }
                 ]
            }).toArray();
            if (docs.length > 0) {
                 console.log(`Collection ${c.name} has ${docs.length} docs with 475.`);
            }
        }

    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
