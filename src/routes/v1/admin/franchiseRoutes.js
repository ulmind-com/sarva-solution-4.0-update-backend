import express from 'express';
import {
    createFranchise,
    listFranchises,
    updateFranchise,
    deleteFranchise,
    blockFranchise,
    unblockFranchise,
    getFranchiseBySearch
} from '../../../controllers/admin/franchise.controller.js';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';
import { validateFranchiseCreation } from '../../../middlewares/validation/franchiseValidation.js';

const router = express.Router();

router.use(authMiddleware, adminMiddleware);


router.post('/create', validateFranchiseCreation, createFranchise);
router.get('/search', getFranchiseBySearch);
router.get('/list', listFranchises);
router.put('/:franchiseId', updateFranchise);
router.delete('/:franchiseId', deleteFranchise);
router.patch('/:franchiseId/block', blockFranchise);
router.patch('/:franchiseId/unblock', unblockFranchise);

export default router;
