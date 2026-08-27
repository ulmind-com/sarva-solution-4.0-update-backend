import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env explicitly
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from '../models/User.model.js';
import UserFinance from '../models/UserFinance.model.js';
import BVTransaction from '../models/BVTransaction.model.js';

async function syncAllBVs() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected. Starting BV Sync Migration...");

        const allUsers = await User.find({});
        console.log(`Found ${allUsers.length} users in database.`);

        let updatedCount = 0;

        for (const user of allUsers) {
            const finance = await UserFinance.findOne({ user: user._id });
            if (!finance) {
                console.log(`WARNING: No finance record for ${user.memberId}`);
                continue;
            }

            const userTrans = await BVTransaction.find({ userId: user._id }).lean();
            
            let calcLeftLegBV = 0;
            let calcRightLegBV = 0;
            let calcLeftLegPV = 0;
            let calcRightLegPV = 0;

            userTrans.forEach(tx => {
                const bAmt = tx.bvAmount || 0;
                const pAmt = tx.pvAmount || 0;

                if (tx.legAffected === 'left') {
                    calcLeftLegBV += bAmt;
                    calcLeftLegPV += pAmt;
                } else if (tx.legAffected === 'right') {
                    calcRightLegBV += bAmt;
                    calcRightLegPV += pAmt;
                }
            });

            const totalCalcBV = calcLeftLegBV + calcRightLegBV;
            const totalCalcPV = calcLeftLegPV + calcRightLegPV;

            const needsBVSync = 
                finance.leftLegBV !== calcLeftLegBV || 
                finance.rightLegBV !== calcRightLegBV || 
                finance.leftLegPV !== calcLeftLegPV || 
                finance.rightLegPV !== calcRightLegPV ||
                finance.totalBV !== totalCalcBV ||
                finance.totalPV !== totalCalcPV;

            if (needsBVSync) {
                console.log(`Updating BV for ${user.memberId}. Old Left: ${finance.leftLegBV}, New Left: ${calcLeftLegBV} | Old Right: ${finance.rightLegBV}, New Right: ${calcRightLegBV}`);
                
                finance.leftLegBV = calcLeftLegBV;
                finance.rightLegBV = calcRightLegBV;
                finance.leftLegPV = calcLeftLegPV;
                finance.rightLegPV = calcRightLegPV;
                finance.totalBV = totalCalcBV;
                finance.totalPV = totalCalcPV;
                await finance.save();

                user.leftLegBV = calcLeftLegBV;
                user.rightLegBV = calcRightLegBV;
                user.leftLegPV = calcLeftLegPV;
                user.rightLegPV = calcRightLegPV;
                user.totalBV = totalCalcBV;
                user.totalPV = totalCalcPV;
                await user.save();
                
                updatedCount++;
            }
        }

        console.log(`\nMigration Complete. Fixed ${updatedCount} users.`);

    } catch (err) {
        console.error("Migration Failed:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

syncAllBVs();
