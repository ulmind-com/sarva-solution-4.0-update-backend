import express from 'express';
import {
    listBonusTypes,
    listBonusPools,
    getBonusQualifiers
} from '../../../controllers/admin/bonusQualifiers.controller.js';

/**
 * Bonus Qualifiers routes (ISOLATED — read only).
 *
 * Mounted under /api/v1/admin, so the auth + admin middleware already applied
 * there covers these as well. Nothing here writes to the database.
 */
const router = express.Router();

router.get('/', listBonusTypes);
router.get('/:bonusType/pools', listBonusPools);
router.get('/:bonusType/qualifiers', getBonusQualifiers);

export default router;
