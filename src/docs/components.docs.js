/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *         error:
 *           type: string
 * 
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         memberId:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         fullName:
 *           type: string
 *         phone:
 *           type: string
 *         panCardNumber:
 *           type: string
 *         sponsorId:
 *           type: string
 *         parentId:
 *           type: string
 *         position:
 *           type: string
 *           enum: [left, right, root]
 *         currentRank:
 *           type: string
 *           enum: [Associate, Star, Bronze, Silver, Gold, Platinum, Diamond, Blue Diamond, Black Diamond, Royal Diamond, Crown Diamond, Ambassador, Crown Ambassador, SSVPL Legend]
 *         starMatching:
 *           type: number
 *         personalBV:
 *           type: number
 *         leftLegBV:
 *           type: number
 *         rightLegBV:
 *           type: number
 *         totalBV:
 *           type: number
 *         wallet:
 *           type: object
 *           properties:
 *             totalEarnings:
 *               type: number
 *             availableBalance:
 *               type: number
 *             withdrawnAmount:
 *               type: number
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 * 
 *     Payout:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         memberId:
 *           type: string
 *         payoutType:
 *           type: string
 *           enum: [direct-referral, rank-bonus, fast-track-bonus, star-matching-bonus, withdrawal, fast-track-deduction, self-repurchase-bonus]
 *         grossAmount:
 *           type: number
 *         adminCharge:
 *           type: number
 *         tdsDeducted:
 *           type: number
 *         netAmount:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed, deducted]
 *         scheduledFor:
 *           type: string
 *           format: date-time
 * 
 *     BVTransaction:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         transactionType:
 *           type: string
 *           enum: [joining, repurchase, downline, admin-adjustment]
 *         bvAmount:
 *           type: number
 *         legAffected:
 *           type: string
 *           enum: [left, right, personal, none]
 *         createdAt:
 *           type: string
 *           format: date-time
 * 
 *     Product:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         bv:
 *           type: number
 *         price:
 *           type: number
 *         description:
 *           type: string
 *         segment:
 *           type: string
 *         image:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *             publicId:
 *               type: string
 *         isActive:
 *           type: boolean
 *
 *     SRBUserStatus:
 *       type: object
 *       description: Self Repurchase Bonus status for a user (current + last month)
 *       properties:
 *         currentMonth:
 *           type: object
 *           properties:
 *             year: { type: integer, example: 2026 }
 *             month: { type: integer, example: 3, description: "1 = January, 12 = December" }
 *             windowBV: { type: number, example: 320, description: "Total BV earned in the 1-17 eligibility window" }
 *             isEligible: { type: boolean, example: false, description: "True if windowBV >= 500" }
 *             bvNeededForEligibility: { type: number, example: 180, description: "Remaining BV needed to qualify (0 if already eligible)" }
 *             eligibilityWindowDay: { type: integer, example: 17 }
 *             windowClosed: { type: boolean, example: false, description: "True after the 17th of the month" }
 *             windowClosesAt: { type: string, example: "2026-03-17 23:59:59" }
 *         lastMonth:
 *           type: object
 *           properties:
 *             year: { type: integer, example: 2026 }
 *             month: { type: integer, example: 2 }
 *             bonusReceived: { type: boolean, example: true }
 *             grossAmount: { type: number, example: 1000 }
 *             netAmount: { type: number, example: 930 }
 *             adminCharge: { type: number, example: 50 }
 *             tdsDeducted: { type: number, example: 20 }
 *             creditedAt: { type: string, format: date-time, nullable: true }
 *
 *     SRBBonusPool:
 *       type: object
 *       description: Monthly Self Repurchase Bonus pool document
 *       properties:
 *         year: { type: integer, example: 2026 }
 *         month: { type: integer, example: 2 }
 *         companyTotalBV: { type: number, example: 100000, description: "Sum of ALL users' repurchase BV for the month" }
 *         poolPercent: { type: number, example: 7 }
 *         poolAmount: { type: number, example: 7000, description: "7% of companyTotalBV" }
 *         eligibleUserCount: { type: integer, example: 7 }
 *         grossSharePerUser: { type: number, example: 1000 }
 *         adminChargePercent: { type: number, example: 5 }
 *         tdsPercent: { type: number, example: 2 }
 *         totalDeductionPct: { type: number, example: 7 }
 *         netSharePerUser: { type: number, example: 930, description: "93% of grossSharePerUser" }
 *         status:
 *           type: string
 *           enum: [pending, distributed, held]
 *           description: "pending = not yet run | distributed = credits issued | held = no eligible users"
 *         distributedAt: { type: string, format: date-time, nullable: true }
 *         notes: { type: string, description: "Reason if pool was held" }
 *
 *     SRBWalletCredit:
 *       type: object
 *       description: Immutable audit record of a user's SRB wallet credit for a given month
 *       properties:
 *         memberId: { type: string, example: "SVS12345678" }
 *         year: { type: integer, example: 2026 }
 *         month: { type: integer, example: 2 }
 *         grossAmount: { type: number, example: 1000, description: "Raw share before deductions" }
 *         adminCharge: { type: number, example: 50, description: "5% of gross" }
 *         tdsDeducted: { type: number, example: 20, description: "2% of gross" }
 *         totalDeduction: { type: number, example: 70, description: "7% of gross" }
 *         netAmount: { type: number, example: 930, description: "93% of gross — credited to wallet" }
 *         creditedAt: { type: string, format: date-time }
 *
 *     SRBCompanyBV:
 *       type: object
 *       description: Aggregated company-wide BV for a calendar month
 *       properties:
 *         year: { type: integer, example: 2026 }
 *         month: { type: integer, example: 3 }
 *         companyTotalBV: { type: number, example: 100000 }
 *         totalTransactions: { type: integer, example: 215, description: "Number of repurchase sale events recorded" }
 *         projectedPool: { type: number, example: 7000, description: "7% of companyTotalBV" }
 *         poolPercent: { type: number, example: 7 }
 *
 *   responses:
 *     BadRequest:
 *       description: Bad Request
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     Unauthorized:
 *       description: Unauthorized
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     Forbidden:
 *       description: Forbidden
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     NotFound:
 *       description: Not Found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     Error:
 *       description: Internal Server Error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 */
