import mongoose from 'mongoose';

export const rankSchema = new mongoose.Schema({
    currentRank: {
        type: String,
        default: 'Associate',
        enum: [
            'Associate', 'Star', 'Bronze', 'Silver', 'Gold', 'Platinum',
            'Diamond', 'Blue Diamond', 'Black Diamond', 'Royal Diamond',
            'Crown Diamond', 'Ambassador', 'Crown Ambassador', 'SSVPL Legend'
        ]
    },
    rankNumber: { type: Number, default: 14 }, // 14=Associate, 1=Legend
    rankBonus: { type: Number, default: 0 },
    achievedDate: Date,
    nextRankRequirement: { type: String },
    rankHistory: [{
        rank: String,
        date: { type: Date, default: Date.now }
    }],
    starMatching: { type: Number, default: 0 }
}, { _id: false });
