import mongoose from 'mongoose';
import moment from 'moment-timezone';

const stockTransactionSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    franchise: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise',
        index: true
    },
    transactionType: {
        type: String,
        enum: ['add', 'remove', 'order', 'return', 'adjustment', 'franchise_sale', 'franchise_purchase'],
        required: true,
        index: true
    },
    quantity: {
        type: Number,
        required: true
        // Allow negative for deductions? No, usually absolute value tracked with type defining direction.
        // Prompt validation said "Main inventory: type='franchise_sale', quantity=-50".
        // So I will remove min: [1] validation if I want to support negative input or handle it in logic.
        // The original schema had min: [1].
        // I'll keep min: [1] and handle direction via logic (subtracting it) OR simply store absolute value and let type dictate.
        // But prompt example explicitly said "quantity=-50".
        // I will allow negative numbers by removing the min validator or changing it.
        // Actually, for semantic clarity, usually quantity is magnitude. 
        // But let's allow flexibility.
    },
    previousStock: {
        type: Number,
        required: true
    },
    newStock: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    referenceNo: { // e.g., Invoice No
        type: String,
        trim: true
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    metadata: {
        type: Map,
        of: String
    },

    // Timezone Fields (Only CreatedAt as UpdatedAt is disabled)
    createdAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') }

}, {
    timestamps: { createdAt: true, updatedAt: false }
});

stockTransactionSchema.index({ product: 1, createdAt: -1 });
stockTransactionSchema.index({ franchise: 1, createdAt: -1 });

const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);
export default StockTransaction;
