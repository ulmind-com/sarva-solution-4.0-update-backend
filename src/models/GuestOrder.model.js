import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * An order placed by a GUEST (non-member, no account) in the public store.
 * Captures contact + delivery details inline since there is no linked user.
 */
const guestOrderSchema = new mongoose.Schema(
    {
        orderId: { type: String, unique: true, index: true },

        customer: {
            name: { type: String, required: true, trim: true },
            phone: { type: String, required: true, trim: true, index: true },
            email: { type: String, trim: true, lowercase: true },
        },

        address: {
            line1: { type: String, required: true, trim: true },
            line2: { type: String, trim: true },
            city: { type: String, required: true, trim: true },
            state: { type: String, required: true, trim: true },
            pincode: { type: String, required: true, trim: true },
        },

        items: [
            {
                product: { type: mongoose.Schema.Types.ObjectId, ref: 'NewProduct', required: true },
                productName: { type: String, required: true },
                price: { type: Number, required: true }, // unit price at order time
                quantity: { type: Number, required: true, min: 1 },
            },
        ],

        itemsTotal: { type: Number, required: true }, // sum(price*qty), pre-tax

        // Tax breakdown by place-of-supply (intra = CGST+SGST, inter = IGST).
        taxType: { type: String, enum: ['intra', 'inter'], default: 'inter' },
        cgstTotal: { type: Number, default: 0 },
        sgstTotal: { type: Number, default: 0 },
        igstTotal: { type: Number, default: 0 },
        taxTotal: { type: Number, default: 0 },
        sellerState: { type: String },

        shippingFee: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },

        paymentMethod: { type: String, enum: ['cod', 'razorpay'], required: true },
        paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },

        // Razorpay linkage (only for online payments)
        razorpayOrderId: { type: String, index: true },
        razorpayPaymentId: { type: String },
        razorpaySignature: { type: String },

        orderStatus: {
            type: String,
            enum: ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'],
            default: 'placed',
            index: true,
        },

        notes: { type: String, trim: true },

        createdAt_IST: { type: String, default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') },
    },
    { timestamps: true }
);

guestOrderSchema.pre('save', function (next) {
    if (!this.orderId) {
        this.orderId = `GO${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0')}`;
    }
    next();
});

const GuestOrder = mongoose.model('GuestOrder', guestOrderSchema);
export default GuestOrder;
