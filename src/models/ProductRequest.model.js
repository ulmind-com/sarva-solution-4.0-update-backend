import mongoose from 'mongoose';
import moment from 'moment-timezone';

const productRequestItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productId: {
        type: String,
        trim: true
    },
    requestedQuantity: {
        type: Number,
        required: true,
        min: 1
    },
    approvedQuantity: { // Set upon approval
        type: Number,
        default: 0
    },
    productDP: {
        type: Number, // Snapshot price at time of request/approval
        required: true
    },
    productMRP: {
        type: Number,
        required: true
    },
    hsnCode: String,
    batchNo: String
});

const productRequestSchema = new mongoose.Schema({
    requestNo: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    franchise: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise',
        required: true,
        index: true
    },
    franchiseGSTIN: String,
    franchiseAccountNo: String,
    requestDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending',
        index: true
    },

    items: [productRequestItemSchema],

    // Estimated Totals (Final totals determined by Invoice)
    estimatedTotal: Number, // Deprecated in favor of grandTotal, but kept for legacy

    // Detailed Tax Breakdown
    totalTaxableValue: { type: Number, default: 0 },
    totalCGST: { type: Number, default: 0 },
    totalSGST: { type: Number, default: 0 },
    totalIGST: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    // Approval Workflow
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectionReason: String,
    notes: String,

    // Resulting Invoice
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    // Timezone Fields
    createdAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') },
    updatedAt_IST: { type: String, default: () => moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss') }

}, {
    timestamps: true
});

productRequestSchema.pre('save', function (next) {
    this.updatedAt_IST = moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
    next();
});

productRequestSchema.index({ franchise: 1, requestDate: -1 });

const ProductRequest = mongoose.model('ProductRequest', productRequestSchema);
export default ProductRequest;
