import Franchise from '../../models/Franchise.model.js';

export const generateVendorId = async () => {
    try {
        // Find the last created franchise sorted by vendorId descending
        // explicitly include deleted ones to ensure uniqueness purely on string value
        const lastFranchise = await Franchise.findOne()
            .sort({ vendorId: -1 })
            .collation({ locale: 'en_US', numericOrdering: true });

        let newIdNumber = 1;

        if (lastFranchise && lastFranchise.vendorId) {
            const lastIdStr = lastFranchise.vendorId.replace('FS', '');
            const lastIdNum = parseInt(lastIdStr, 10);

            if (!isNaN(lastIdNum)) {
                newIdNumber = lastIdNum + 1;
            }
        }

        const paddedNum = String(newIdNumber).padStart(6, '0');
        const newVendorId = `FS${paddedNum}`;

        // Double check existence (unlikely but safe for race conditions check at app level)
        const exists = await Franchise.findOne({ vendorId: newVendorId });
        if (exists) {
            // Very rare collision in high concurrency if not locked at DB level
            // Simple retry logic (recursion)
            return generateVendorId();
        }

        return newVendorId;

    } catch (error) {
        throw new Error(`Failed to generate Vendor ID: ${error.message}`);
    }
};
