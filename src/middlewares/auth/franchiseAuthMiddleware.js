import jwt from 'jsonwebtoken';
import Franchise from '../../models/Franchise.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const franchiseAuth = asyncHandler(async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        throw new ApiError(401, 'No token provided, access denied');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        if (decoded.role !== 'franchise') {
            throw new ApiError(403, 'Access denied. Franchise role required.');
        }

        const franchise = await Franchise.findById(decoded.franchiseId);

        if (!franchise) {
            throw new ApiError(401, 'Franchise account not found');
        }

        if (franchise.isBlocked) {
            throw new ApiError(403, `Account blocked. Reason: ${franchise.blockReason}`);
        }

        req.franchise = franchise;
        next();

    } catch (error) {
        throw new ApiError(401, 'Invalid or expired token');
    }
});
