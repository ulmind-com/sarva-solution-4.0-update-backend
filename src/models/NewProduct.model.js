import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * Retail product for the PUBLIC / GUEST store (no login required to browse or buy).
 * Completely isolated from the MLM `Product` model — no BV/PV/DP/tax-commission fields.
 */
const newProductSchema = new mongoose.Schema(
    {
        productName: { type: String, required: true, trim: true, index: true },
        productId: { type: String, unique: true, index: true, trim: true },
        description: { type: String, required: true },

        // Pricing (plain retail)
        price: { type: Number, required: true, min: 0 }, // selling price (pre-tax base)
        mrp: { type: Number, required: true, min: 0 },
        discount: { type: Number, default: 0 }, // percentage

        // GST rates (percentages). Applied at checkout by place-of-supply:
        // intra-state (buyer in seller's state) -> CGST + SGST; inter-state -> IGST.
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        igst: { type: Number, default: 0 },

        category: { type: String, trim: true, index: true },

        productImage: {
            url: { type: String, required: true },
            publicId: { type: String, required: true },
        },

        stockQuantity: { type: Number, required: true, min: 0, default: 0 },
        isInStock: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true, index: true },
        isFeatured: { type: Boolean, default: false },

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        deletedAt: { type: Date, default: null },

        createdAt_IST: { type: String, default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') },
        updatedAt_IST: { type: String, default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') },
    },
    { timestamps: true }
);

newProductSchema.index({ productName: 'text', description: 'text', category: 'text' });

newProductSchema.pre('save', function (next) {
    if (!this.productId) {
        this.productId = `NP${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0')}`;
    }
    this.isInStock = this.stockQuantity > 0;
    this.updatedAt_IST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    next();
});

const NewProduct = mongoose.model('NewProduct', newProductSchema);
export default NewProduct;
