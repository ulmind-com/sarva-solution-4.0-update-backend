import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB from './config/db.js';
import Configs from './config/config.js';
import chalk from 'chalk';
import { initCrons } from './services/business/cron.service.js';

connectDB().then(() => {
    initCrons();
});

const PORT = Configs.PORT || 8000;

app.listen(PORT, (err) => {
    if (err) {
        console.log(chalk.red('Server Connection Error'));
    }
    else {
        console.log(chalk.green(`Server running in ${Configs.NODE_ENV || 'development'} mode on port ${PORT}`));
    }
});
