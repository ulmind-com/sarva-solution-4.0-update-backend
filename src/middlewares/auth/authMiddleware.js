import jwt from 'jsonwebtoken';
import User from '../../models/User.model.js';

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided, authorization denied'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        // Verify user still exists
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User no longer exists'
            });
        }

        // Read fresh from the database on every request, so blocking a member
        // ends the session they are already in rather than waiting for the token
        // to expire.
        if (user.isBlocked) {
            return res.status(401).json({
                success: false,
                message: user.blockReason
                    ? `Account Suspended. Reason: ${user.blockReason}`
                    : 'Account Suspended. Please contact support.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token is not valid'
        });
    }
};

export default authMiddleware;
