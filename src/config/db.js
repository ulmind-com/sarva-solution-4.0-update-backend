import mongoose from 'mongoose';
import Configs from './config.js';
import chalk from 'chalk';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(Configs.MONGO_URI);
        console.log(chalk.green(`MongoDB Connected:\nDatabase Name: ${conn.connection.name}\nMongo Port: ${conn.connection.port}`));
    } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
    }
};

export default connectDB;
