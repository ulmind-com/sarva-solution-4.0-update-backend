import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const adminDb = mongoose.connection.db.admin();
        const dbs = await adminDb.listDatabases();
        console.log(dbs.databases.map(db => db.name));

    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
