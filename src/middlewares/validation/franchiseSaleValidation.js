export const validateFranchiseSale = (req, res, next) => {
    const { memberId, items } = req.body;

    if (!memberId || typeof memberId !== 'string' || memberId.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Member ID is required and must be a valid string'
        });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Items array is required and must contain at least one item'
        });
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (!item.productId) {
            return res.status(400).json({
                success: false,
                message: `Item at index ${i}: productId is required`
            });
        }

        if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: `Item at index ${i}: quantity must be a positive number`
            });
        }
    }

    next();
};
