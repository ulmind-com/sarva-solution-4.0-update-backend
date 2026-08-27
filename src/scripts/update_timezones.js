import mongoose from 'mongoose';
import chalk from 'chalk';
import moment from 'moment-timezone';
import Configs from '../config/config.js';

// Import Models
import User from '../models/User.model.js';
import UserFinance from '../models/UserFinance.model.js';
import Payout from '../models/Payout.model.js';
import Product from '../models/Product.model.js';
import ProductRequest from '../models/ProductRequest.model.js';
import FranchiseSale from '../models/FranchiseSale.model.js';
import BVTransaction from '../models/BVTransaction.model.js';
import BankAccount from '../models/BankAccount.model.js';
import Franchise from '../models/Franchise.model.js';
import FranchiseInventory from '../models/FranchiseInventory.model.js';
import Invoice from '../models/Invoice.model.js';
import StockTransaction from '../models/StockTransaction.model.js';

const models = [
    { name: 'User', model: User },
    { name: 'UserFinance', model: UserFinance },
    { name: 'Payout', model: Payout },
    { name: 'Product', model: Product },
    { name: 'ProductRequest', model: ProductRequest },
    { name: 'FranchiseSale', model: FranchiseSale },
    { name: 'BVTransaction', model: BVTransaction },
    { name: 'BankAccount', model: BankAccount },
    { name: 'Franchise', model: Franchise },
    { name: 'FranchiseInventory', model: FranchiseInventory },
    { name: 'Invoice', model: Invoice },
    { name: 'StockTransaction', model: StockTransaction }
];

const updateTimezones = async () => {
    console.log(chalk.yellow('Starting Timezone Migration Script...'));

    if (!Configs.MONGO_URI) {
        console.error(chalk.red('FATAL: MONGO_URI is not defined in Configs. Check .env file.'));
        process.exit(1);
    }

    console.log(chalk.blue(`Use MONGO_URI from Configs...`));

    try {
        await mongoose.connect(Configs.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log(chalk.green('✓ Connected to MongoDB.'));

        for (const { name, model } of models) {
            process.stdout.write(chalk.cyan(`Processing ${name}... `));

            try {
                const docs = await model.find({});

                if (docs.length === 0) {
                    console.log(chalk.yellow('Skipped (0 docs)'));
                    continue;
                }

                let updatedCount = 0;
                const bulkOps = [];

                for (const doc of docs) {
                    const createdDate = doc.createdAt || (doc._id && doc._id.getTimestamp()) || new Date();
                    const updatedDate = doc.updatedAt || new Date();

                    const createdAt_IST = moment(createdDate).tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
                    const updatedAt_IST = moment(updatedDate).tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');

                    bulkOps.push({
                        updateOne: {
                            filter: { _id: doc._id },
                            update: {
                                $set: {
                                    createdAt_IST: createdAt_IST,
                                    updatedAt_IST: updatedAt_IST
                                }
                            }
                        }
                    });

                    updatedCount++;
                }

                if (bulkOps.length > 0) {
                    await model.bulkWrite(bulkOps);
                    console.log(chalk.green(`✓ Updated ${updatedCount}/${docs.length}`));
                } else {
                    console.log(chalk.yellow('- No updates needed'));
                }
            } catch (err) {
                console.log(chalk.red(`Error processing ${name}: ${err.message}`));
            }
        }

        console.log(chalk.magenta('\nGlobal Timezone Update Completed successfully.'));
        process.exit(0);

    } catch (error) {
        console.error(chalk.red('\nMigration Error:'), error.message);
        process.exit(1);
    }
};

updateTimezones();
