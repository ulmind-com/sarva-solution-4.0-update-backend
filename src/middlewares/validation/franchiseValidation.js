import { body, validationResult } from 'express-validator';
import { ApiError } from '../../utils/ApiError.js';

export const validateFranchiseCreation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('shopName').trim().notEmpty().withMessage('Shop Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required'),
    body('password').trim().notEmpty().withMessage('Password is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('shopAddress.street').trim().notEmpty().withMessage('Street address is required'),
    body('shopAddress.pincode').matches(/^\d{6}$/).withMessage('Valid 6-digit pincode is required'),
    body('shopAddress.state').trim().notEmpty().withMessage('State is required'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, "Validation Failed", errors.array());
        }
        next();
    }
];
