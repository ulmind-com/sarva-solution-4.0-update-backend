import crypto from 'crypto';
import Razorpay from 'razorpay';
import NewProduct from '../../models/NewProduct.model.js';
import GuestOrder from '../../models/GuestOrder.model.js';
import StoreConfig from '../../models/StoreConfig.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/* --------------------------------- helpers -------------------------------- */

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const norm = (s) => (s || '').toString().trim().toLowerCase();

// Re-price the cart from the DB (never trust client prices) and validate stock.
async function buildOrderItems(cartItems) {
    if (!Array.isArray(cartItems) || cartItems.length === 0) throw new ApiError(400, 'Cart is empty');
    const items = [];
    for (const ci of cartItems) {
        const product = await NewProduct.findOne({ _id: ci.productId, deletedAt: null, isActive: true });
        if (!product) throw new ApiError(400, 'One or more products are unavailable');
        const qty = Math.max(1, Number(ci.quantity) || 1);
        if (product.stockQuantity < qty) throw new ApiError(400, `${product.productName} is out of stock`);
        items.push({
            product: product._id,
            productName: product.productName,
            price: product.price,
            quantity: qty,
            cgst: product.cgst || 0,
            sgst: product.sgst || 0,
            igst: product.igst || 0,
        });
    }
    return items;
}

// GST place-of-supply: buyer in the seller's state -> CGST+SGST, otherwise -> IGST.
function computeTotals(items, deliveryState, sellerState, shippingFee) {
    const intra = norm(deliveryState) === norm(sellerState);
    let itemsTotal = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0;
    for (const it of items) {
        const line = it.price * it.quantity;
        itemsTotal += line;
        if (intra) {
            cgstTotal += (line * (it.cgst || 0)) / 100;
            sgstTotal += (line * (it.sgst || 0)) / 100;
        } else {
            igstTotal += (line * (it.igst || 0)) / 100;
        }
    }
    const taxTotal = cgstTotal + sgstTotal + igstTotal;
    return {
        taxType: intra ? 'intra' : 'inter',
        itemsTotal: round2(itemsTotal),
        cgstTotal: round2(cgstTotal),
        sgstTotal: round2(sgstTotal),
        igstTotal: round2(igstTotal),
        taxTotal: round2(taxTotal),
        totalAmount: round2(itemsTotal + taxTotal + (shippingFee || 0)),
    };
}

function validateCustomer(body) {
    const { customer, address } = body;
    if (!customer?.name || !customer?.phone) throw new ApiError(400, 'Name and phone are required');
    if (!address?.line1 || !address?.city || !address?.state || !address?.pincode) {
        throw new ApiError(400, 'Complete delivery address is required');
    }
    return { customer, address };
}

// Decrement stock once an order is confirmed (COD placed / online paid).
async function decrementStock(items) {
    for (const it of items) {
        await NewProduct.updateOne(
            { _id: it.product, stockQuantity: { $gte: it.quantity } },
            { $inc: { stockQuantity: -it.quantity } }
        );
    }
    // Refresh isInStock flags.
    for (const it of items) {
        const p = await NewProduct.findById(it.product);
        if (p) { p.isInStock = p.stockQuantity > 0; await p.save(); }
    }
}

async function getRazorpay(cfg) {
    if (!cfg.razorpayKeyId || !cfg.razorpayKeySecret) throw new ApiError(400, 'Online payment is not configured');
    return new Razorpay({ key_id: cfg.razorpayKeyId, key_secret: cfg.razorpayKeySecret });
}

/* --------------------------------- PUBLIC --------------------------------- */

// POST /api/v1/newproducts/orders  — place a COD order
export const placeCodOrder = asyncHandler(async (req, res) => {
    const cfg = await StoreConfig.getSingleton();
    if (!cfg.storeEnabled) throw new ApiError(403, 'Store is currently closed');
    if (!cfg.codEnabled) throw new ApiError(403, 'Cash on Delivery is not available');

    const { customer, address } = validateCustomer(req.body);
    const items = await buildOrderItems(req.body.items);
    const shippingFee = cfg.shippingFee || 0;
    const t = computeTotals(items, address.state, cfg.sellerState, shippingFee);

    const order = await GuestOrder.create({
        customer,
        address,
        items,
        itemsTotal: t.itemsTotal,
        taxType: t.taxType,
        cgstTotal: t.cgstTotal,
        sgstTotal: t.sgstTotal,
        igstTotal: t.igstTotal,
        taxTotal: t.taxTotal,
        sellerState: cfg.sellerState,
        shippingFee,
        totalAmount: t.totalAmount,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        orderStatus: 'placed',
        notes: req.body.notes,
    });

    await decrementStock(items);
    return res.status(201).json(new ApiResponse(201, order, 'Order placed successfully'));
});

// POST /api/v1/newproducts/orders/razorpay  — create a Razorpay order + a pending GuestOrder
export const createRazorpayOrder = asyncHandler(async (req, res) => {
    const cfg = await StoreConfig.getSingleton();
    if (!cfg.storeEnabled) throw new ApiError(403, 'Store is currently closed');
    if (!cfg.onlineEnabled) throw new ApiError(403, 'Online payment is not available');

    const { customer, address } = validateCustomer(req.body);
    const items = await buildOrderItems(req.body.items);
    const shippingFee = cfg.shippingFee || 0;
    const t = computeTotals(items, address.state, cfg.sellerState, shippingFee);

    const razorpay = await getRazorpay(cfg);
    const rpOrder = await razorpay.orders.create({
        amount: Math.round(t.totalAmount * 100), // paise
        currency: cfg.currency || 'INR',
        receipt: `go_${Date.now()}`,
    });

    // IMPORTANT: no GuestOrder is persisted here. The order is created only after the
    // payment is verified (see verifyRazorpayPayment), so cancelled/abandoned checkouts
    // never leave a stray "pending" order behind in the admin.
    return res.status(201).json(
        new ApiResponse(201, {
            razorpayOrderId: rpOrder.id,
            amount: rpOrder.amount,
            currency: rpOrder.currency,
            keyId: cfg.razorpayKeyId,
        }, 'Razorpay order created')
    );
});

// POST /api/v1/newproducts/orders/razorpay/verify  — verify signature & confirm payment
export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new ApiError(400, 'Missing payment verification fields');
    }

    const cfg = await StoreConfig.getSingleton();
    const expected = crypto
        .createHmac('sha256', cfg.razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
    if (expected !== razorpay_signature) throw new ApiError(400, 'Payment verification failed');

    // Idempotency — a repeated verify (e.g. retry) returns the existing order.
    const existing = await GuestOrder.findOne({ razorpayPaymentId: razorpay_payment_id });
    if (existing) return res.status(200).json(new ApiResponse(200, existing, 'Payment already verified'));

    // Payment succeeded — NOW create the order (cart + customer re-validated from the request).
    const { customer, address } = validateCustomer(req.body);
    const items = await buildOrderItems(req.body.items);
    const shippingFee = cfg.shippingFee || 0;
    const t = computeTotals(items, address.state, cfg.sellerState, shippingFee);

    const order = await GuestOrder.create({
        customer,
        address,
        items,
        itemsTotal: t.itemsTotal,
        taxType: t.taxType,
        cgstTotal: t.cgstTotal,
        sgstTotal: t.sgstTotal,
        igstTotal: t.igstTotal,
        taxTotal: t.taxTotal,
        sellerState: cfg.sellerState,
        shippingFee,
        totalAmount: t.totalAmount,
        paymentMethod: 'razorpay',
        paymentStatus: 'paid',
        orderStatus: 'placed',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        notes: req.body.notes,
    });
    await decrementStock(items);

    return res.status(200).json(new ApiResponse(200, order, 'Payment verified, order confirmed'));
});

// GET /api/v1/newproducts/orders/:orderId  — guest tracks their order (by internal id)
export const trackGuestOrder = asyncHandler(async (req, res) => {
    const order = await GuestOrder.findById(req.params.orderId).lean();
    if (!order) throw new ApiError(404, 'Order not found');
    return res.status(200).json(new ApiResponse(200, order, 'Order fetched'));
});

/* --------------------------------- ADMIN ---------------------------------- */

// GET /api/v1/admin/guest-orders
export const adminListGuestOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, orderStatus, paymentStatus, search } = req.query;
    const query = {};
    if (orderStatus) query.orderStatus = orderStatus;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) {
        query.$or = [
            { orderId: new RegExp(search, 'i') },
            { 'customer.phone': new RegExp(search, 'i') },
            { 'customer.name': new RegExp(search, 'i') },
        ];
    }

    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));
    const [orders, total] = await Promise.all([
        GuestOrder.find(query).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
        GuestOrder.countDocuments(query),
    ]);
    const totalPages = Math.ceil(total / l) || 1;
    return res.status(200).json(
        new ApiResponse(200, { orders, pagination: { total, currentPage: p, totalPages } }, 'Orders fetched')
    );
});

// GET /api/v1/admin/guest-orders/:id
export const adminGetGuestOrder = asyncHandler(async (req, res) => {
    const order = await GuestOrder.findById(req.params.id).lean();
    if (!order) throw new ApiError(404, 'Order not found');
    return res.status(200).json(new ApiResponse(200, order, 'Order fetched'));
});

// PATCH /api/v1/admin/guest-orders/:id  — update fulfilment / COD payment status
export const adminUpdateGuestOrder = asyncHandler(async (req, res) => {
    const order = await GuestOrder.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');

    const { orderStatus, paymentStatus, notes } = req.body;
    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus; // e.g. mark COD 'paid' on delivery
    if (notes !== undefined) order.notes = notes;

    await order.save();
    return res.status(200).json(new ApiResponse(200, order, 'Order updated'));
});
