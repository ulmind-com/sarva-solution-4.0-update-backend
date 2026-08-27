import mongoose from 'mongoose';
import moment from 'moment-timezone';

const masterStockTransferSchema = new mongoose.Schema({
    fromMasterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise',
        required: true,
        index: true
    },
    toSubFranchiseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise',
        required: true,
        index: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantityTransferred: {
        type: Number,
        required: true,
        min: 1
    },
    transferDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    transferStatus: {
        type: String,
        enum: ['completed', 'cancelled'],
        default: 'completed'
    },
    transferNotes: String,

    // Timezone Fields
    createdAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') },
    updatedAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') }
}, {
    timestamps: true
});

masterStockTransferSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
    next();
});

const MasterStockTransfer = mongoose.model('MasterStockTransfer', masterStockTransferSchema);
export default MasterStockTransfer;
