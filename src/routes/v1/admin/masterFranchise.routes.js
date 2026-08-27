import express from 'express';
import authMiddleware from '../../../middlewares/auth/authMiddleware.js';
import adminMiddleware from '../../../middlewares/auth/adminMiddleware.js';
import {
    assignMasterFranchise,
    getMasterFranchiseList,
    removeMasterFranchise,
    getAvailableFranchises,
    getLiveEarnings,
    getPendingNetworkRequests,
    approveNetworkRequest,
    rejectNetworkRequest
} from '../../../controllers/admin/masterFranchise.controller.js';

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/eligible', getAvailableFranchises);
router.post('/', assignMasterFranchise);
router.get('/', getMasterFranchiseList);
router.get('/:masterId/live-earnings', getLiveEarnings);
router.get('/:masterId/pending-requests', getPendingNetworkRequests);
router.put('/:masterId/approve-request/:subId', approveNetworkRequest);
router.delete('/:masterId/reject-request/:subId', rejectNetworkRequest);
router.delete('/:relationId', removeMasterFranchise);
export default router;
