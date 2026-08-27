import StoreConfig from '../../models/StoreConfig.model.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Shape returned to the PUBLIC app — the Razorpay *key id* is safe to expose (it's the publishable
// key used to open checkout on the client); the *secret* is NEVER sent.
const publicShape = (cfg) => ({
    storeEnabled: cfg.storeEnabled,
    codEnabled: cfg.codEnabled,
    onlineEnabled: cfg.onlineEnabled && !!cfg.razorpayKeyId,
    razorpayKeyId: cfg.razorpayKeyId || '',
    shippingFee: cfg.shippingFee || 0,
    currency: cfg.currency || 'INR',
    storeName: cfg.storeName || 'Sarva Store',
    sellerState: cfg.sellerState || 'West Bengal',
});

// GET /api/v1/newproducts/config  — public (no auth)
export const getPublicStoreConfig = asyncHandler(async (req, res) => {
    const cfg = await StoreConfig.getSingleton();
    return res.status(200).json(new ApiResponse(200, publicShape(cfg), 'Store config fetched'));
});

// GET /api/v1/admin/store-config  — admin (secret stripped, only shows whether it's set)
export const getStoreConfig = asyncHandler(async (req, res) => {
    const cfg = await StoreConfig.getSingleton();
    return res.status(200).json(
        new ApiResponse(200, {
            ...publicShape(cfg),
            razorpayKeySecretSet: !!cfg.razorpayKeySecret,
            memberCodEnabled: cfg.memberCodEnabled,
            memberOnlineEnabled: cfg.memberOnlineEnabled,
            memberShippingFee: cfg.memberShippingFee || 0,
        }, 'Store config fetched')
    );
});

// PUT /api/v1/admin/store-config  — admin update
export const updateStoreConfig = asyncHandler(async (req, res) => {
    const cfg = await StoreConfig.getSingleton();

    ['storeEnabled', 'codEnabled', 'onlineEnabled', 'memberCodEnabled', 'memberOnlineEnabled'].forEach((f) => {
        if (req.body[f] !== undefined) cfg[f] = req.body[f] === true || req.body[f] === 'true';
    });
    ['razorpayKeyId', 'currency', 'storeName', 'sellerState'].forEach((f) => {
        if (req.body[f] !== undefined) cfg[f] = req.body[f];
    });
    if (req.body.shippingFee !== undefined) cfg.shippingFee = Number(req.body.shippingFee) || 0;
    if (req.body.memberShippingFee !== undefined) cfg.memberShippingFee = Number(req.body.memberShippingFee) || 0;
    // Only overwrite the secret when a non-empty value is sent (so re-saving the form without
    // re-entering the secret keeps the existing one).
    if (req.body.razorpayKeySecret) cfg.razorpayKeySecret = req.body.razorpayKeySecret;

    await cfg.save();
    return res.status(200).json(
        new ApiResponse(200, { ...publicShape(cfg), razorpayKeySecretSet: !!cfg.razorpayKeySecret, memberShippingFee: cfg.memberShippingFee || 0 }, 'Store config updated')
    );
});
