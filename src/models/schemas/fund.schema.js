import mongoose from 'mongoose';

export const fundSchema = new mongoose.Schema({
    units: { type: Number, default: 0 },
    totalBVContributed: { type: Number, default: 0 },
    lastAchieved: Date,
    nextTargetBV: { type: Number },
    paymentSchedule: { type: String } // e.g. 'half-yearly', 'annual'
}, { _id: false });
