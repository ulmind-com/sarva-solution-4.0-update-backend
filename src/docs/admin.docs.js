/**
 * @swagger
 * tags:
 *   - name: Admin - Users
 *     description: Administrative user management operations (Admin Access Only)
 *   - name: Admin - Payouts
 *     description: Payout request management and processing (Admin Access Only)
 *   - name: Admin - System
 *     description: System management, metrics, and database operations (Admin Access Only)
 * 
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: |
 *       **Admin Access Only** - Retrieve a complete list of all registered users in the system.
 *     tags:
 *       - Admin - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 * 
 * /api/v1/admin/users/kyc-details:
 *   get:
 *     summary: Get all users with full KYC and Bank details (Admin only)
 *     description: |
 *       **Admin Access Only** - Retrieve a comprehensive list of users including their KYC status, Aadhaar/PAN info, and Bank account details.
 *       Used by admins to verify users' identities and bank accounts.
 *     tags:
 *       - Admin - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [none, pending, verified, rejected]
 *         description: Filter by KYC status
 *     responses:
 *       200:
 *         description: User KYC and bank details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fullName: { type: string }
 *                       memberId: { type: string }
 *                       phone: { type: string }
 *                       email: { type: string }
 *                       panCardNumber: { type: string }
 *                       address: { $ref: '#/components/schemas/Address' }
 *                       kyc: { $ref: '#/components/schemas/KYC' }
 *                       bankAccount:
 *                         type: object
 *                         properties:
 *                           accountName: { type: string }
 *                           accountNumber: { type: string }
 *                           bankName: { type: string }
 *                           ifscCode: { type: string }
 *                           branch: { type: string }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 * 
 * /api/v1/admin/users/{memberId}:

 *   get:
 *     summary: Get user details by member ID (Admin only)
 *     description: |
 *       **Admin Access Only** - Retrieve detailed information for a specific user.
 *     tags:
 *       - Admin - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         example: SVS000001
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     bankAccount:
 *                       type: object
 *       404:
 *         $ref: '#/components/responses/NotFound'
 * 
 *   patch:
 *     summary: Update any user's details (Admin only)
 *     description: |
 *       **Admin Access Only** - Update any field for a specific user including KYC, bank details, PAN, Aadhar, etc.
 *       
 *       **Admin can update everything:**
 *       - Personal details (fullName, email, phone, username)
 *       - KYC details (status, aadhaarNumber, images)
 *       - Bank account (account name, number, IFSC, branch, bank name)
 *       - PAN card number
 *       - Address, profile picture, rank, status
 *     tags:
 *       - Admin - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         example: SVS000001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               rank:
 *                 type: string
 *                 enum: [Associate, Bronze, Silver, Gold, Platinum, Diamond, Blue Diamond, Black Diamond, Royal Diamond, Crown Diamond, Ambassador, Crown Ambassador, SSVPL Legend]
 *                 example: Silver
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *                 example: active
 *               joiningPackage:
 *                 type: number
 *                 example: 500
 *               panCardNumber:
 *                 type: string
 *                 example: "ABCDE1234F"
 *               kyc:
 *                 type: object
 *                 description: Admin can update all KYC fields
 *                 properties:
 *                   status:
 *                     type: string
 *                     enum: [none, pending, verified, rejected]
 *                     example: verified
 *                   aadhaarNumber:
 *                     type: string
 *                     example: "123456789012"
 *                   aadhaarFront:
 *                     type: object
 *                     properties:
 *                       url: { type: string }
 *                       publicId: { type: string }
 *                   aadhaarBack:
 *                     type: object
 *                     properties:
 *                       url: { type: string }
 *                       publicId: { type: string }
 *                   panImage:
 *                     type: object
 *                     properties:
 *                       url: { type: string }
 *                       publicId: { type: string }
 *                   rejectionReason:
 *                     type: string
 *                     example: "Aadhaar image unclear"
 *               bankDetails:
 *                 type: object
 *                 description: Bank account details (stored in separate BankAccount collection). Admin can create or update all fields.
 *                 properties:
 *                   accountName:
 *                     type: string
 *                     example: "John Doe"
 *                   accountNumber:
 *                     type: string
 *                     example: "1234567890"
 *                   bankName:
 *                     type: string
 *                     example: "HDFC Bank"
 *                   ifscCode:
 *                     type: string
 *                     example: "HDFC0001234"
 *                   branch:
 *                     type: string
 *                     example: "Mumbai Main Branch"
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 * /api/v1/admin/users/{memberId}/change-password:
 *   patch:
 *     summary: Force Change User Password (Admin only)
 *     description: |
 *       **Admin Access Only** - Directly updates a user's password without needing old password.
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "newSecurePas$123"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Password too short
 *       404:
 *         description: User not found
 * 
 * /api/v1/admin/kyc/verify/{memberId}:
 *   patch:
 *     summary: Verify or Reject user KYC (Admin only)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [verified, rejected]
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: KYC status updated
 * 
 * /api/v1/admin/dashboard-metrics:
 *   get:
 *     summary: Get global system metrics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics summary fetched
 * 
 * /api/v1/admin/user-wallets:
 *   get:
 *     summary: Get all user wallets sorted by balance (Admin only)
 *     description: |
 *       **Admin Access Only** - Retrieves a paginated list of all users and their available wallet balances.
 *       Users with the highest balances appear at the top.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: User wallets fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "User wallets fetched successfully" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     wallets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId: { type: string, example: "65ab..." }
 *                           memberId: { type: string, example: "SVS12345678" }
 *                           username: { type: string, example: "Rakesh Kumar" }
 *                           walletBalance: { type: number, example: 15400.50 }
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total: { type: integer, example: 1500 }
 *                         page: { type: integer, example: 1 }
 *                         pages: { type: integer, example: 30 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 * 
 * /api/v1/admin/wallet-logs:
 *   get:
 *     summary: Get all user wallet logs grouped by day (Admin only)
 *     description: |
 *       **Admin Access Only** - Retrieves a global list of all wallet transactions (inbound bonuses and outbound withdrawals) across all users.
 *       Logs are automatically **grouped by day** and sorted with the most recent groupings first. Inside each day, individual transactions are also sorted newest first.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for raw logs (before grouping)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of raw logs per page
 *     responses:
 *       200:
 *         description: Global wallet logs fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Global wallet logs fetched successfully" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     groupedLogs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date: { type: string, example: "2026-03-17" }
 *                           logs:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 userId: { type: string }
 *                                 memberId: { type: string, example: "SVS12345678" }
 *                                 username: { type: string, example: "Rakesh Kumar" }
 *                                 amount: { type: number, example: 500 }
 *                                 grossAmount: { type: number, example: 537.63 }
 *                                 purpose: { type: string, example: "fast-track-bonus" }
 *                                 status: { type: string, example: "completed" }
 *                                 time: { type: string, example: "14:30:15" }
 *                                 createdAt: { type: string, format: "date-time" }
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total: { type: integer, example: 1500 }
 *                         page: { type: integer, example: 1 }
 *                         pages: { type: integer, example: 30 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 * 
 * /api/v1/admin/tree-bv-summary/{memberId}:
 *   get:
 *     summary: Get exact Left & Right Downline BV for Date Ranges (Admin only)
 *     description: |
 *       **Admin Access Only** - Retrieves the raw generated Business Volume (BV) from any user's descending left branch and right branch.
 *       The API outputs three defined timeframes synchronously: Current Month, Half-Yearly (Apr-Sept / Oct-Mar), and Annually (April-March).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         example: "SVS12345678"
 *         description: Member ID to query
 *     responses:
 *       200:
 *         description: Tree BV Summary fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Tree BV Summary fetched successfully" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         memberId: { type: string, example: "SVS12345678" }
 *                         username: { type: string, example: "AlexM" }
 *                         fullName: { type: string, example: "Alex Murphy" }
 *                     timeframes:
 *                       type: object
 *                       properties:
 *                         currentMonth:
 *                           type: object
 *                           properties:
 *                             start: { type: string, example: "2026-03-01" }
 *                             end: { type: string, example: "2026-03-31" }
 *                         halfYearly:
 *                           type: object
 *                           properties:
 *                             start: { type: string, example: "2025-10-01" }
 *                             end: { type: string, example: "2026-03-31" }
 *                         annually:
 *                           type: object
 *                           properties:
 *                             start: { type: string, example: "2025-04-01" }
 *                             end: { type: string, example: "2026-03-31" }
 *                     bvSummary:
 *                       type: object
 *                       properties:
 *                         left:
 *                           type: object
 *                           properties:
 *                             currentMonth: { type: number, example: 500 }
 *                             halfYearly: { type: number, example: 1500 }
 *                             annually: { type: number, example: 3500 }
 *                         right:
 *                           type: object
 *                           properties:
 *                             currentMonth: { type: number, example: 200 }
 *                             halfYearly: { type: number, example: 1200 }
 *                             annually: { type: number, example: 5000 }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 * 
 * /api/v1/admin/payouts:
 *   get:
 *     summary: Get all payout requests (Withdrawals Only)
 *     description: Get payout requests (Withdrawals).
 *     tags: [Admin]
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
 *           Filter by status (Case-Insensitive):
 *           - `pending`: Show only pending requests.
 *           - `completed`: Show only accepted/completed requests.
 *           - `rejected`: Show only rejected requests.
 *           - `all`: Show transaction history (Completed + Rejected), excluding pending.
 *           - *Invalid/Empty*: Returns strict match (likely 0 results) or All if omitted.
 *     responses:
 *       200:
 *         description: List of payouts retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payout'
 * 
 * /api/v1/admin/payouts/process:
 *   post:
 *     summary: Verify & Process Payout (Approve/Reject)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [payoutId, status]
 *             properties:
 *               payoutId: { type: string }
 *               status: { type: string, enum: [completed, rejected] }
 *               rejectionReason: { type: string }
 *     responses:
 *       200:
 *         description: Payout processed successfully
 * 
 * /api/v1/admin/payouts/{payoutId}/accept:
 *   patch:
 *     summary: Mark Payout as Paid (Approve)
 *     description: |
 *       **Admin Access Only** - Approve a pending payout request. Status changes to 'completed'.
 *       Pending withdrawal amount is cleared from user wallet.
 *     tags: [Admin - Payouts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payout accepted successfully
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Payout not found
 * 
 * /api/v1/admin/payouts/{payoutId}/reject:
 *   patch:
 *     summary: Reject Payout Request
 *     description: |
 *       **Admin Access Only** - Reject a pending payout request. Status changes to 'rejected'.
 *       Funds are **REFUNDED** to the User's Available Balance.
 *     tags: [Admin - Payouts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rejectionReason]
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 example: "Start of year audit hold"
 *     responses:
 *       200:
 *         description: Payout rejected and refunded
 *       400:
 *         description: Reason required (-10 chars)
 *       404:
 *         description: Payout not found
 * 
 * /api/v1/admin/bv/allocate-manual:
 *   post:
 *     summary: Manually adjust/allocate BV to a user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberId, bvAmount, leg]
 *             properties:
 *               memberId: { type: string }
 *               bvAmount: { type: number }
 *               leg: { type: string, enum: [left, right, personal] }
 *     responses:
 *       200:
 *         description: BV allocated
 * 
 * */

/**
 * @swagger
 * /api/v1/admin/trigger-bonus:
 *   post:
 *     summary: Manually trigger bonus matching (Admin/Dev only)
 *     description: Forces Fast Track or Star Matching calculation for a specific user. Use carefully.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberId, type]
 *             properties:
 *               memberId: { type: string }
 *               type: { type: string, enum: [fast-track, star-match] }
 *     responses:
 *       200:
 *         description: Matching triggered successfully
 * */

/**
 * @swagger
 * /api/v1/admin/transactions:
 *   get:
 *     summary: Audit all BV transactions (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: memberId
 *         schema:
 *           type: string
 *         description: Filter by member ID (e.g., SVS000001)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by transaction type
 *     responses:
 *       200:
 *         description: Transaction log retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                     pagination:
 *                       type: object
 * 
 * /api/v1/admin/franchise/{franchiseId}:
 *   put:
 *     summary: Update Franchise Details (Admin only)
 *     description: |
 *       **Admin Access Only** - Update details including **Password**, Address, Shop Name, etc.
 *       Immutable fields: `vendorId`, `email` (use direct DB update if critical).
 *     tags: [Admin - Franchise]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: franchiseId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               shopName: { type: string }
 *               phone: { type: string }
 *               password: { type: string, description: "Send new password to reset it" }
 *               city: { type: string }
 *               shopAddress: { type: object }
 *     responses:
 *       200:
 *         description: Franchise updated
 *       404:
 *         description: Franchise not found
 * 
 *   delete:
 *     summary: Delete Franchise (Soft Delete)
 *     description: |
 *       **Admin Access Only** - Soft delete a franchise (mark as inactive/deleted).
 *     tags: [Admin - Franchise]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: franchiseId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Franchise deleted successfully
 *       404:
 *         description: Franchise not found
 * */
