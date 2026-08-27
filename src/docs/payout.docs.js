/**
 * @swagger
 * components:
 *   schemas:
 *     Payout:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *         userId:
 *           type: string
 *           example: 507f191e810c19729de860ea
 *         memberId:
 *           type: string
 *           example: SVS000123
 *         payoutType:
 *           type: string
 *           enum: [fast-track-bonus, star-matching-bonus, rank-bonus, withdrawal, direct-referral]
 *           example: fast-track-bonus
 *         grossAmount:
 *           type: number
 *           example: 500
 *           description: Amount before deductions
 *         adminCharge:
 *           type: number
 *           example: 25
 *           description: 5% admin charge
 *         tdsDeducted:
 *           type: number
 *           example: 10
 *           description: 2% TDS
 *         netAmount:
 *           type: number
 *           example: 465
 *           description: Amount user receives
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed, rejected]
 *           example: pending
 *         scheduledFor:
 *           type: string
 *           format: date-time
 *           example: 2026-02-07T11:00:00.000Z
 *         processedAt:
 *           type: string
 *           format: date-time
 *           example: 2026-02-03T10:30:00.000Z
 *         metadata:
 *           type: object
 *           properties:
 *             rejectionReason:
 *               type: string
 *               example: Incomplete KYC documentation
 *             closings:
 *               type: number
 *             bvMatched:
 *               type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     RejectPayoutRequest:
 *       type: object
 *       required:
 *         - rejectionReason
 *       properties:
 *         rejectionReason:
 *           type: string
 *           minLength: 10
 *           example: User has incomplete KYC documents. Please resubmit Aadhaar card.
 *           description: Reason for rejecting the payout (minimum 10 characters)
 */

/**
 * @swagger
 * /api/v1/admin/payouts:
 *   get:
 *     summary: Get all payout requests (Admin only)
 *     description: |
 *       **Admin Access Only** - Retrieve all **Withdrawal Requests** (`payoutType: withdrawal`) with optional status filtering.
 *       **Note:** This endpoint filters out internal system bonuses (e.g., fast-track-bonus) and only shows user-initiated or system-generated withdrawal requests meant for bank transfer.
 *       
 *       Payout requests are **automatically generated every Friday at 12:00 AM IST** for all eligible users.
 *       This endpoint allows administrators to view and manage these automatic withdrawal requests.
 *       
 *       **Eligibility Criteria (Automatic):**
 *       - Available Balance > ₹450
 *       - **No KYC Required**
 *       - **No Admin/TDS Deductions** (100% of Available Balance is requested)
 *       
 *       Results include user details and bank information for processing.
 *     tags:
 *       - Admin - Payouts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, completed, rejected, all]
 *         description: |
 *           Filter payouts by status (Case-Insensitive):
 *           - `pending`: Show only Pending requests.
 *           - `completed` (or `accepted`): Show only Completed/Accepted requests.
 *           - `rejected`: Show only Rejected requests.
 *           - `all`: Show History (Completed + Rejected), excluding Pending.
 *           - *Invalid Status*: Returns empty list.
 *         example: pending
 *     responses:
 *       200:
 *         description: List of payouts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Payouts fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payout'
 *             example:
 *               success: true
 *               statusCode: 200
 *               message: Payouts fetched successfully
 *               data:
 *                 - _id: 507f1f77bcf86cd799439011
 *                   memberId: SVS000123
 *                   grossAmount: 500
 *                   netAmount: 465
 *                   status: pending
 *                   payoutType: fast-track-bonus
 *                   scheduledFor: 2026-02-07T11:00:00.000Z
 *                   userId:
 *                     fullName: John Doe
 *                     email: john@example.com
 *                     phone: +919876543210
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /api/v1/admin/payouts/{payoutId}/accept:
 *   patch:
 *     summary: Accept/Approve a pending payout request (Admin only)
 *     description: |
 *       **Admin Access Only** - Approves a pending payout request and marks it as completed.
 *       
 *       **Process:**
 *       1. Validates payout exists and is in 'pending' status
 *       2. Clears pending withdrawal from user wallet
 *       3. Marks payout as 'completed' with timestamp
 *       4. Sends email notification to user
 *       
 *       **Note:** Available balance and withdrawn amount were already adjusted when the user requested the payout.
 *     tags:
 *       - Admin - Payouts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the payout request
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Payout accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Payout accepted successfully
 *                 data:
 *                   $ref: '#/components/schemas/Payout'
 *             example:
 *               success: true
 *               statusCode: 200
 *               message: Payout accepted successfully
 *               data:
 *                 _id: 507f1f77bcf86cd799439011
 *                 memberId: SVS000123
 *                 grossAmount: 500
 *                 adminCharge: 25
 *                 tdsDeducted: 10
 *                 netAmount: 465
 *                 status: completed
 *                 processedAt: 2026-02-03T00:50:00.000Z
 *       400:
 *         description: Bad request - Payout is not in pending status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Error'
 *             example:
 *               success: false
 *               statusCode: 400
 *               message: "Cannot accept payout. Current status: completed"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Payout request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Error'
 *             example:
 *               success: false
 *               statusCode: 404
 *               message: Payout request not found
 */

/**
 * @swagger
 * /api/v1/admin/payouts/{payoutId}/reject:
 *   patch:
 *     summary: Reject a pending payout request (Admin only)
 *     description: |
 *       **Admin Access Only** - Rejects a pending payout request and refunds the amount to user's wallet.
 *       
 *       **Process:**
 *       1. Validates payout exists and is in 'pending' status
 *       2. Validates rejection reason (minimum 10 characters)
 *       3. Refunds gross amount to user's available balance
 *       4. Clears pending withdrawal
 *       5. Reverts withdrawn amount counter
 *       6. Stores rejection reason in payout metadata
 *       
 *       **Wallet Updates:**
 *       - `availableBalance` += grossAmount (full refund including fees)
 *       - `pendingWithdrawal` -= netAmount
 *       - `withdrawnAmount` -= grossAmount
 *     tags:
 *       - Admin - Payouts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the payout request
 *         example: 507f1f77bcf86cd799439011
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RejectPayoutRequest'
 *           example:
 *             rejectionReason: Incomplete or invalid KYC documents. Please resubmit clear copies of Aadhaar card.
 *     responses:
 *       200:
 *         description: Payout rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Payout rejected successfully
 *                 data:
 *                   $ref: '#/components/schemas/Payout'
 *             example:
 *               success: true
 *               statusCode: 200
 *               message: Payout rejected successfully
 *               data:
 *                 _id: 507f1f77bcf86cd799439011
 *                 memberId: SVS000123
 *                 grossAmount: 500
 *                 netAmount: 465
 *                 status: rejected
 *                 metadata:
 *                   rejectionReason: Incomplete or invalid KYC documents. Please resubmit clear copies of Aadhaar card.
 *       400:
 *         description: Bad request - Invalid rejection reason or payout status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Error'
 *             examples:
 *               invalidReason:
 *                 summary: Rejection reason too short
 *                 value:
 *                   success: false
 *                   statusCode: 400
 *                   message: Rejection reason is required and must be at least 10 characters
 *               invalidStatus:
 *                 summary: Payout already processed
 *                 value:
 *                   success: false
 *                   statusCode: 400
 *                   message: "Cannot reject payout. Current status: completed"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Payout request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Error'
 *             example:
 *               success: false
 *               statusCode: 404
 *               message: Payout request not found
 */
