import crypto from 'crypto';
import Razorpay from 'razorpay';
import Product from '../../models/Product.model.js';
import MemberOrder from '../../models/MemberOrder.model.js';
import StoreConfig from '../../models/StoreConfig.model.js';
import UserFinance from '../../models/UserFinance.model.js';
import Payout from '../../models/Payout.model.js';

// Records a wallet debit/refund in the Payout history (what the wallet page shows) without
// touching the wallet card totals (those come from UserFinance.wallet directly).
async function recordWalletTxn(user, payoutType, amount) {
    try {
        await Payout.create({
            userId: user._id,
            memberId: user.memberId,
            payoutType,
            grossAmount: amount,
            netAmount: amount,
            status: 'completed',
            processedAt: new Date(),
        });
    } catch {
        // best-effort — never fail the order over the history log
    }
}
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Re-price the cart from the DB (never trust client prices).
async function buildItems(cartItems) {
    if (!Array.isArray(cartItems) || cartItems.length === 0) throw new ApiError(400, 'Cart is empty');
    const items = [];
    let itemsTotal = 0;
    for (const ci of cartItems) {
        const product = await Product.findOne({ _id: ci.productId, deletedAt: null, isActive: true });
        if (!product) throw new ApiError(400, 'One or more products are unavailable');
        const qty = Math.max(1, Number(ci.quantity) || 1);
        // Members buy at Dealer Price (DP) — the price the member store shows.
        const price = product.productDP || product.price || product.mrp || 0;
        itemsTotal += price * qty;
        items.push({ product: product._id, productName: product.productName, price, quantity: qty });
    }
    return { items, itemsTotal: round2(itemsTotal) };
}

async function getRazorpay(cfg) {
    if (!cfg.razorpayKeyId || !cfg.razorpayKeySecret) throw new ApiError(400, 'Online payment is not configured');
    return new Razorpay({ key_id: cfg.razorpayKeyId, key_secret: cfg.razorpayKeySecret });
}

// Snapshot the member's contact + address from their account.
function memberSnapshot(user) {
    return {
        customerName: user.fullName,
        customerPhone: user.phone,
        address: user.address || {},
    };
}

// Member store shipping fee (isolated from the guest store's shippingFee).
const memberShipping = (cfg) => round2(Number(cfg.memberShippingFee) || 0);

async function createOrder({ user, items, itemsTotal, shippingFee = 0, paymentMethod, paymentStatus, message, extra = {} }) {
    const snap = memberSnapshot(user);
    return MemberOrder.create({
        user: user._id,
        memberId: user.memberId,
        customerName: snap.customerName,
        customerPhone: snap.customerPhone,
        address: snap.address,
        items,
        itemsTotal,
        shippingFee,
        totalAmount: round2(itemsTotal + shippingFee),
        paymentMethod,
        paymentStatus,
        adminStatus: 'pending',
        message: (message || '').toString().trim() || undefined,
        ...extra,
    });
}

/* --------------------------------- MEMBER (authed) --------------------------------- */

// GET /api/v1/user/member-store/config
export const getMemberStoreConfig = asyncHandler(async (req, res) => {
    const cfg = await StoreConfig.getSingleton();
    const fin = await UserFinance.findOne({ user: req.user._id }).select('wallet');
    return res.status(200).json(
        new ApiResponse(200, {
            codEnabled: cfg.memberCodEnabled,
            onlineEnabled: cfg.memberOnlineEnabled && !!cfg.razorpayKeyId,
            razorpayKeyId: cfg.razorpayKeyId || '',
            walletBalance: fin?.wallet?.availableBalance || 0,
            currency: cfg.currency || 'INR',
            storeName: cfg.storeName || 'Sarva Store',
            shippingFee: memberShipping(cfg),
        }, 'Member store config')
    );
});

// POST /api/v1/user/member-store/orders/cod
export const placeMemberCodOrder = asyncHandler(async (req, res) => {
    const cfg = await StoreConfig.getSingleton();
    if (!cfg.memberCodEnabled) throw new ApiError(403, 'Cash on Delivery is not available');
    const { items, itemsTotal } = await buildItems(req.body.items);
    const shippingFee = memberShipping(cfg);
    const order = await createOrder({ user: req.user, items, itemsTotal, shippingFee, paymentMethod: 'cod', paymentStatus: 'pending', message: req.body.message });
    return res.status(201).json(new ApiResponse(201, order, 'Order placed — awaiting admin approval'));
});

// POST /api/v1/user/member-store/orders/wallet
export const placeMemberWalletOrder = asyncHandler(async (req, res) => {
    const cfg = await StoreConfig.getSingleton();
    const { items, itemsTotal } = await buildItems(req.body.items);
    const shippingFee = memberShipping(cfg);
    const payable = round2(itemsTotal + shippingFee);
    const fin = await UserFinance.findOne({ user: req.user._id });
    if (!fin) throw new ApiError(400, 'Wallet not found');
    if ((fin.wallet?.availableBalance || 0) < payable) throw new ApiError(400, 'Insufficient wallet balance');

    fin.wallet.availableBalance = round2(fin.wallet.availableBalance - payable);
    await fin.save();

    const order = await createOrder({
        user: req.user, items, itemsTotal, shippingFee,
        paymentMethod: 'wallet', paymentStatus: 'paid', message: req.body.message,
        extra: { walletDebited: payable },
    });
    await recordWalletTxn(req.user, 'store-purchase', payable);
    return res.status(201).json(new ApiResponse(201, order, 'Paid from wallet — awaiting admin approval'));
});

// POST /api/v1/user/member-store/orders/razorpay
export const createMemberRazorpayOrder = asyncHandler(async (req, res) => {
    const cfg = await StoreConfig.getSingleton();
    if (!cfg.memberOnlineEnabled) throw new ApiError(403, 'Online payment is not available');
    const { itemsTotal } = await buildItems(req.body.items);
    const payable = round2(itemsTotal + memberShipping(cfg));
    const razorpay = await getRazorpay(cfg);
    const rpOrder = await razorpay.orders.create({
        amount: Math.round(payable * 100),
        currency: cfg.currency || 'INR',
        receipt: `mo_${Date.now()}`,
    });
    return res.status(201).json(
        new ApiResponse(201, { razorpayOrderId: rpOrder.id, amount: rpOrder.amount, currency: rpOrder.currency, keyId: cfg.razorpayKeyId }, 'Razorpay order created')
    );
});

// POST /api/v1/user/member-store/orders/razorpay/verify
export const verifyMemberRazorpayPayment = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) throw new ApiError(400, 'Missing payment verification fields');

    const cfg = await StoreConfig.getSingleton();
    const expected = crypto.createHmac('sha256', cfg.razorpayKeySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature) throw new ApiError(400, 'Payment verification failed');

    const existing = await MemberOrder.findOne({ razorpayPaymentId: razorpay_payment_id });
    if (existing) return res.status(200).json(new ApiResponse(200, existing, 'Payment already verified'));

    const { items, itemsTotal } = await buildItems(req.body.items);
    const order = await createOrder({
        user: req.user, items, itemsTotal, shippingFee: memberShipping(cfg),
        paymentMethod: 'razorpay', paymentStatus: 'paid', message: req.body.message,
        extra: { razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature },
    });
    return res.status(200).json(new ApiResponse(200, order, 'Payment verified — awaiting admin approval'));
});

// GET /api/v1/user/member-store/orders
export const getMyMemberOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));
    const [orders, total] = await Promise.all([
        MemberOrder.find({ user: req.user._id }).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
        MemberOrder.countDocuments({ user: req.user._id }),
    ]);
    return res.status(200).json(new ApiResponse(200, { orders, pagination: { total, currentPage: p, totalPages: Math.ceil(total / l) || 1 } }, 'Your orders'));
});

/* --------------------------------- ADMIN --------------------------------- */

// GET /api/v1/admin/member-store/orders
export const adminListMemberOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, adminStatus, paymentStatus, search } = req.query;
    const query = {};
    if (adminStatus) query.adminStatus = adminStatus;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) query.$or = [{ orderId: new RegExp(search, 'i') }, { memberId: new RegExp(search, 'i') }, { customerName: new RegExp(search, 'i') }];

    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));
    const [orders, total] = await Promise.all([
        MemberOrder.find(query).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
        MemberOrder.countDocuments(query),
    ]);
    return res.status(200).json(new ApiResponse(200, { orders, pagination: { total, currentPage: p, totalPages: Math.ceil(total / l) || 1 } }, 'Member orders'));
});

// GET /api/v1/admin/member-store/orders/:id
export const adminGetMemberOrder = asyncHandler(async (req, res) => {
    const order = await MemberOrder.findById(req.params.id).lean();
    if (!order) throw new ApiError(404, 'Order not found');
    return res.status(200).json(new ApiResponse(200, order, 'Order'));
});

// PATCH /api/v1/admin/member-store/orders/:id/decide  { decision: 'accepted'|'rejected', adminNote? }
export const adminDecideMemberOrder = asyncHandler(async (req, res) => {
    const { decision, adminNote } = req.body;
    if (!['accepted', 'rejected'].includes(decision)) throw new ApiError(400, 'decision must be accepted or rejected');

    const order = await MemberOrder.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.adminStatus !== 'pending') throw new ApiError(400, `Order already ${order.adminStatus}`);

    if (decision === 'rejected' && order.paymentMethod === 'wallet' && order.walletDebited > 0) {
        // Refund the wallet debit on rejection.
        const fin = await UserFinance.findOne({ user: order.user });
        if (fin) {
            fin.wallet.availableBalance = round2((fin.wallet.availableBalance || 0) + order.walletDebited);
            await fin.save();
        }
        await recordWalletTxn({ _id: order.user, memberId: order.memberId }, 'store-purchase-refund', order.walletDebited);
    }

    order.adminStatus = decision;
    if (adminNote !== undefined) order.adminNote = adminNote;
    await order.save();
    return res.status(200).json(new ApiResponse(200, order, `Order ${decision}`));
});
