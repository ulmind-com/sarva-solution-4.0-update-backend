
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const fixIndexes = async () => {
    try {
        console.log(chalk.blue('Connectng to MongoDB...'));
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(chalk.green(`Connected to ${conn.connection.name}`));

        const collection = conn.connection.db.collection('products');

        // List Indexes
        const indexes = await collection.indexes();
        console.log(chalk.yellow('Current Indexes:'));
        indexes.forEach(idx => console.log(` - ${idx.name}`));

        // Drop sku_1 if exists
        if (indexes.find(idx => idx.name === 'sku_1')) {
            console.log(chalk.red('Dropping sku_1 index...'));
            await collection.dropIndex('sku_1');
            console.log(chalk.green('Index sku_1 dropped successfully.'));
        } else {
            console.log(chalk.green('Index sku_1 not found.'));
        }

        process.exit(0);
    } catch (error) {
        console.error(chalk.red('Error fixing indexes:'), error);
        process.exit(1);
    }
};

fixIndexes();
