import express from 'express';
import { getBVSummary, getFundsStatus, requestPayout, getWalletInfo, getTree, getPayouts, getBonusStatus, getFastTrackBonusStatus, getStarMatchingBonusStatus, getMyWalletAdjustments, getTreeBVSummary, getPublicTreeBVSummary, getIsolatedRankIncomes } from '../../../controllers/user/userFinancial.controller.js';
import { getUserProducts, getProductDetails } from '../../../controllers/user/product.controller.js';
import { getProductsByCategory } from '../../../controllers/user/categoryProducts.controller.js';
import { getUserSRBStatus, getUserPersonalRepurchaseBV } from '../../../controllers/user/selfRepurchase.controller.js';
import { getMyBBStatus, getMyBBHistory, getPublicBBStatus, getMyLiveEstimate } from '../../../controllers/user/beginnerBonus.controller.js';
import { getMySubStatus, getMySubHistory, getPublicSubStatus, getMySubLiveEstimate } from '../../../controllers/user/startUpBonus.controller.js';
import { getMyLBStatus, getMyLBHistory, getPublicLBStatus, getMyLBLiveEstimate } from '../../../controllers/user/leadershipBonus.controller.js';
import { getMyTFStatus, getMyTFHistory, getPublicTFStatus, getMyTFLiveEstimate } from '../../../controllers/user/tourFund.controller.js';
import { getMyHEBStatus, getMyHEBHistory, getPublicHEBStatus, getMyHEBLiveEstimate } from '../../../controllers/user/healthEducationBonus.controller.js';
import { getMyBCFStatus, getMyBCFHistory, getPublicBCFStatus, getMyBCFLiveEstimate } from '../../../controllers/user/bikeCarFund.controller.js';
import * as houseFundController from '../../../controllers/user/houseFund.controller.js';
import * as royaltyFundController from '../../../controllers/user/royaltyFund.controller.js';
import * as ssvplSuperBonusController from '../../../controllers/user/ssvplSuperBonus.controller.js';
import * as historicalBvController from '../../../controllers/user/historicalBv.controller.js';
import { getSavingsWallet, getSavingsWalletHistory, getMySavingsWalletAdjustments } from '../../../controllers/user/savingsWallet.controller.js';
import { getMyPersonalBVSummary, getPublicPersonalBVSummary } from '../../../controllers/user/personalBv.controller.js';

import authMiddleware from '../../../middlewares/auth/authMiddleware.js';

const router = express.Router();

// Public Routes (No Authentication Required)
router.get('/products/:productId', getProductDetails);
router.get('/tree-bv-summary/:memberId', getPublicTreeBVSummary);
router.get('/personal-bv-summary/:memberId', getPublicPersonalBVSummary); // Isolated: any user's own BV, date-bucketed
router.get('/beginner-bonus/status/:memberId', getPublicBBStatus);
router.get('/startup-bonus/status/:memberId', getPublicSubStatus);
router.get('/leadership-bonus/status/:memberId', getPublicLBStatus); // Public Leadership Bonus status
router.get('/tour-fund/status/:memberId', getPublicTFStatus); // Public Tour Fund status
router.get('/health-education-bonus/status/:memberId', getPublicHEBStatus); // Public Health & Education Bonus status
router.get('/bike-car-fund/status/:memberId', getPublicBCFStatus); // Public Bike & Car Fund status
router.get('/house-fund/status/:memberId', houseFundController.getPublicHouseFundStatus); // Public House Fund status
router.get('/royalty-fund/status/:memberId', royaltyFundController.getPublicRoyaltyFundStatus); // Public Royalty Fund status
router.get('/ssvpl-super-bonus/status/:memberId', ssvplSuperBonusController.getPublicSsvplSuperBonusStatus); // Public SSVPL Super Bonus status


// Protected Routes (Authentication Required)
router.use(authMiddleware);

// Member store (logged-in members buy from the Product catalog — COD/Razorpay/Wallet).
import memberStoreRoutes from './memberStore.routes.js';
router.use('/member-store', memberStoreRoutes);

router.get('/bv-summary', getBVSummary);
router.get('/tree-bv-summary', getTreeBVSummary); // New: Date-bucketed left/right BV totals
router.get('/personal-bv-summary', getMyPersonalBVSummary); // Isolated: my own BV, date-bucketed
router.get('/funds-status', getFundsStatus);

router.get('/wallet', getWalletInfo);
router.get('/tree', getTree);
router.get('/tree_view', getTree); // Alias for easy tree implementation
router.get('/tree/:memberId', getTree);
router.get('/payouts', getPayouts);
router.get('/wallet-adjustments', getMyWalletAdjustments);
router.get('/incomes/isolated-rank', getIsolatedRankIncomes);

// Savings Wallet (ISOLATED feature) — deposit-only wallet fed by 10% of every income's gross
router.get('/savings-wallet', getSavingsWallet);
router.get('/savings-wallet/history', getSavingsWalletHistory);
router.get('/savings-wallet/adjustments', getMySavingsWalletAdjustments);

// Historical BV Tracking (Isolated functionality)
router.get('/bv-history/monthly', historicalBvController.getMonthlyHistoryList);
router.get('/bv-history/half-yearly', historicalBvController.getHalfYearlyHistoryList);
router.get('/bv-history/yearly', historicalBvController.getYearlyHistoryList);
router.get('/bonus-status', getBonusStatus); // Combined (Legacy/Overview)
router.get('/fast-track-status', getFastTrackBonusStatus); // New: Fast Track Specific
router.get('/star-matching-status', getStarMatchingBonusStatus); // New: Star Matching Specific
router.post('/request-payout', requestPayout);

// Self Repurchase Bonus
router.get('/self-repurchase-bonus/status', getUserSRBStatus);
router.get('/self-repurchase-bonus/personal-bv', getUserPersonalRepurchaseBV);

// Beginner Bonus
router.get('/beginner-bonus/status', getMyBBStatus);
router.get('/beginner-bonus/history', getMyBBHistory);
router.get('/beginner-bonus/live-estimate', getMyLiveEstimate);

// Start Up Bonus
router.get('/startup-bonus/status', getMySubStatus);
router.get('/startup-bonus/history', getMySubHistory);
router.get('/startup-bonus/live-estimate', getMySubLiveEstimate);

// Leadership Bonus
router.get('/leadership-bonus/status', getMyLBStatus);
router.get('/leadership-bonus/history', getMyLBHistory);
router.get('/leadership-bonus/live-estimate', getMyLBLiveEstimate);

// Tour Fund
router.get('/tour-fund/status', getMyTFStatus);
router.get('/tour-fund/history', getMyTFHistory);
router.get('/tour-fund/live-estimate', getMyTFLiveEstimate);

// Health & Education Bonus
router.get('/health-education-bonus/status', getMyHEBStatus);
router.get('/health-education-bonus/history', getMyHEBHistory);
router.get('/health-education-bonus/live-estimate', getMyHEBLiveEstimate);

// Bike & Car Fund
router.get('/bike-car-fund/status', getMyBCFStatus);
router.get('/bike-car-fund/history', getMyBCFHistory);
router.get('/bike-car-fund/live-estimate', getMyBCFLiveEstimate);

// House Fund
router.get('/house-fund/status', houseFundController.getUserHouseFundStatus);
router.get('/house-fund/history', houseFundController.getUserHouseFundHistory);
router.get('/house-fund/live-estimate', houseFundController.getUserLiveEstimate);

// Royalty Fund
router.get('/royalty-fund/status', royaltyFundController.getUserRoyaltyFundStatus);
router.get('/royalty-fund/history', royaltyFundController.getUserRoyaltyFundHistory);
router.get('/royalty-fund/live-estimate', royaltyFundController.getUserLiveEstimate);

// SSVPL Super Bonus
router.get('/ssvpl-super-bonus/status', ssvplSuperBonusController.getUserSsvplSuperBonusStatus);
router.get('/ssvpl-super-bonus/history', ssvplSuperBonusController.getUserSsvplSuperBonusHistory);
router.get('/ssvpl-super-bonus/live-estimate', ssvplSuperBonusController.getUserLiveEstimate);


// Product Browsing (authenticated)
router.get('/products', getUserProducts);
router.get('/products-by-category', getProductsByCategory);

import { getDirectTeam, getCompleteTeam, getStarCount, getIsolatedRank } from '../../../controllers/user/user.controller.js';
import { activateUser } from '../../../controllers/user/activate_user.controller.js';

router.post('/activate', activateUser);
router.get('/direct-team', getDirectTeam); // New Route for Direct Team List
router.get('/team/complete', getCompleteTeam); // Recursively fetch complete team by leg
router.get('/network/star-count/:memberId', getStarCount); // Fetches Left & Right exact Star counts
router.get('/network/rank/:memberId', getIsolatedRank); // Public API to fetch just the user's isolated rank

import { getMyPurchases } from '../../../controllers/user/purchase.controller.js';

router.get('/purchases', getMyPurchases);

import { changePassword } from '../../../controllers/user/password.controller.js';

router.put('/change-password', changePassword);

export default router;
