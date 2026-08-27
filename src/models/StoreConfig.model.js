import mongoose from 'mongoose';

/**
 * Singleton config for the public/guest store. Admin sets the Razorpay credentials here and
 * toggles COD / whether the store is open. Only ONE document ever exists (key: 'public-store').
 * NOTE: `razorpayKeySecret` is sensitive — it is never returned by the public config endpoint,
 * and is stripped from the admin GET response too (admin only sees whether it is set).
 */
const storeConfigSchema = new mongoose.Schema(
    {
        key: { type: String, default: 'public-store', unique: true, index: true },

        storeEnabled: { type: Boolean, default: true },
        codEnabled: { type: Boolean, default: true },
        onlineEnabled: { type: Boolean, default: true },

        // Member (logged-in) store toggles — reuses the same Razorpay creds below.
        memberCodEnabled: { type: Boolean, default: true },
        memberOnlineEnabled: { type: Boolean, default: true },

        razorpayKeyId: { type: String, default: '' },
        razorpayKeySecret: { type: String, default: '' },

        shippingFee: { type: Number, default: 0 }, // guest (no-login) store shipping fee
        memberShippingFee: { type: Number, default: 0 }, // logged-in member store shipping fee (isolated from guest)
        currency: { type: String, default: 'INR' },
        storeName: { type: String, default: 'Sarva Store' },

        // Place of supply of the seller. Delivery within this state = CGST+SGST; outside = IGST.
        sellerState: { type: String, default: 'West Bengal' },
    },
    { timestamps: true }
);

// Convenience: fetch (creating on first access) the single config document.
storeConfigSchema.statics.getSingleton = async function () {
    let cfg = await this.findOne({ key: 'public-store' });
    if (!cfg) cfg = await this.create({ key: 'public-store' });
    return cfg;
};

const StoreConfig = mongoose.model('StoreConfig', storeConfigSchema);
export default StoreConfig;
