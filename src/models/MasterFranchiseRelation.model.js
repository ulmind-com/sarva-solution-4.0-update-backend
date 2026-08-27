import mongoose from 'mongoose';
import moment from 'moment-timezone';

const masterFranchiseRelationSchema = new mongoose.Schema({
    masterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise',
        required: true,
        unique: true,
        index: true
    },
    subFranchises: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise',
        index: true
    }],
    pendingSubFranchises: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise',
        index: true
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Admin ID
    },
    notes: String,
    
    // Timezone Fields
    createdAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') },
    updatedAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') }
}, {
    timestamps: true
});

masterFranchiseRelationSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
    next();
});

const MasterFranchiseRelation = mongoose.model('MasterFranchiseRelation', masterFranchiseRelationSchema);
export default MasterFranchiseRelation;
