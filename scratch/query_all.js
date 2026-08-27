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
        const collectionNames = collections.map(c => c.name);

        console.log("Searching all collections for these memberIds and the amount 475...\n");

        for (const cName of collectionNames) {
            const collection = db.collection(cName);
            
            // Search for memberIds
            const docs = await collection.find({
                $or: [
                    { memberId: { $in: memberIds } },
                    { 'transactions.amount': 475 },
                    { amount: 475 },
                    { netAmount: 475 },
                    { totalAmount: 475 },
                    { amountCredited: 475 },
                    { amountDebited: 475 }
                ]
            }).toArray();

            const relevantDocs = docs.filter(d => {
                // Return true if it matches our users or has amount 475 in some shape
                if (d.memberId && memberIds.includes(d.memberId)) {
                    // if it matches memberId, does it have 475? Or just created on May 1 2026?
                    const dateStr = JSON.stringify(d);
                    if (dateStr.includes('475') || dateStr.includes('2026-05-01') || dateStr.includes('May 1')) return true;
                }
                
                // If it doesn't match memberId, but has 475 amount, return true
                const asStr = JSON.stringify(d);
                if (asStr.includes('475')) {
                     // Check if it belongs to one of the users?
                     // Maybe it uses `user` ObjectId instead of `memberId`
                     return true;
                }
                return false;
            });

            if (relevantDocs.length > 0) {
                 console.log(`\n=== Collection: ${cName} ===`);
                 for(let doc of relevantDocs) {
                     console.log(JSON.stringify(doc, null, 2));
                 }
            }
        }

    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
