import mongoose from 'mongoose';
import moment from 'moment-timezone';

/**
 * An order placed by a LOGGED-IN member from the in-app member store (existing `Product`
 * catalog). Isolated from the guest store (`GuestOrder`) and from franchise sales.
 * Payment: COD / Razorpay / Wallet. Admin simply Accepts or Rejects the request — no
 * shipping/fulfilment pipeline (admin arranges delivery themselves).
 */
const memberOrderSchema = new mongoose.Schema(
    {
        orderId: { type: String, unique: true, index: true },

        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        memberId: { type: String, required: true, index: true },
        customerName: { type: String },
        customerPhone: { type: String },
        address: { type: mongoose.Schema.Types.Mixed }, // snapshot from the member's account

        items: [
            {
                product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
                productName: { type: String, required: true },
                price: { type: Number, required: true },
                quantity: { type: Number, required: true, min: 1 },
            },
        ],

        itemsTotal: { type: Number, required: true },
        shippingFee: { type: Number, default: 0 }, // member store shipping (from StoreConfig.memberShippingFee)
        totalAmount: { type: Number, required: true }, // itemsTotal + shippingFee

        paymentMethod: { type: String, enum: ['cod', 'razorpay', 'wallet'], required: true },
        paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },

        razorpayOrderId: { type: String, index: true },
        razorpayPaymentId: { type: String },
        razorpaySignature: { type: String },

        walletDebited: { type: Number, default: 0 }, // amount taken from wallet (for refund on reject)

        message: { type: String, trim: true }, // note from the member

        // Admin decision — the whole workflow the client asked for.
        adminStatus: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true },
        adminNote: { type: String, trim: true },

        createdAt_IST: { type: String, default: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') },
    },
    { timestamps: true }
);

memberOrderSchema.pre('save', function (next) {
    if (!this.orderId) {
        this.orderId = `MO${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0')}`;
    }
    next();
});

const MemberOrder = mongoose.model('MemberOrder', memberOrderSchema);
export default MemberOrder;
