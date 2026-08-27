/**
 * @swagger
 * tags:
 *   name: User - Financial
 *   description: User financial operations - BV summaries, fund tracking, wallet management, and payout requests (Authenticated Users Only)
 */

/**
 * @swagger
 * /api/v1/user/first-purchase-status:
 *   get:
 *     summary: Check if user has made first purchase (User only)
 *     description: |
 *       **User Access Only** - Check if the explicit first purchase flag is set.
 *     tags: [User - Account]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     isFirstPurchaseDone: { type: boolean }
 * */

/**
 * @swagger
 * /api/v1/user/bv-summary:
 *   get:
 *     summary: Get BV balance and transaction history (User only)
 *     description: |
 *       **User Access Only** - Retrieve your Business Volume (BV) summary and recent transactions.
 *       
 *       Returns BV balances for both legs and recent transaction history.
 *     tags: [User - Financial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: BV Summary fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary: { $ref: '#/components/schemas/User' }
 *                     recentTransactions: { type: array, items: { $ref: '#/components/schemas/BVTransaction' } }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/funds-status:
 *   get:
 *     summary: Get status of all 4 Funds (User only)
 *     description: |
 *       **User Access Only** - View status of Bike, House, Royalty, and Super funds.
 *     tags: [User - Financial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Funds status fetched
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/tree-bv-summary:
 *   get:
 *     summary: Get exact Left & Right Downline BV for Date Ranges (User only)
 *     description: |
 *       **User Access Only** - Retrieves the raw generated Business Volume (BV) from the authenticated user's descending left branch and right branch.
 *       The API outputs three defined timeframes synchronously: Current Month, Half-Yearly (Apr-Sept / Oct-Mar), and Annually (April-March).
 *     tags: [User - Financial]
 *     security:
 *       - bearerAuth: []
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
 *                         memberId: { type: string, example: "SVS1812" }
 *                         username: { type: string, example: "RakeshK" }
 *                         fullName: { type: string, example: "Rakesh Kumar" }
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *       404:
 *         description: User not found
 *
 * /api/v1/user/tree-bv-summary/{memberId}:
 *   get:
 *     summary: Get Tree BV Summary for any member dynamically (Public)
 *     description: |
 *       **Public Access** - Retrieves the raw generated Business Volume (BV) from the specified member's descending left branch and right branch. 
 *       Operates exactly like the authenticated version but requires the `memberId` parameter.
 *     tags: [User - Financial]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Member ID (e.g. SVS000001) to fetch the tree summary for
 *     responses:
 *       200:
 *         description: Public Tree BV Summary fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Public Tree BV Summary fetched successfully" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         memberId: { type: string, example: "SVS000001" }
 *                         username: { type: string, example: "superadmin" }
 *                         fullName: { type: string, example: "Super Admin" }
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
 *         description: User not found
 */

/**
 * @swagger
 * /api/v1/user/bonus-status:
 *   get:
 *     summary: Get Fast Track & Star Matching Bonus Status (User only)
 *     description: |
 *       **User Access Only** - Returns detailed stats for Fast Track daily closings and Star Matching progress.
 *     tags: [User - Financial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bonus status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     fastTrack:
 *                       type: object
 *                       properties:
 *                         dailyClosings: { type: number, description: "Max 6 per day" }
 *                         pendingLeft: { type: number }
 *                         pendingRight: { type: number }
 *                         carryForwardLeft: { type: number }
 *                         carryForwardRight: { type: number }
 *                         totalEarned: { type: number }
 *                         overallTotalEarnings: { type: number, description: "Total Wallet Earnings" }
 *                         nextClosingWindow: { type: string, format: date-time }
 *                         history:
 *                           type: array
 *                           items: { $ref: '#/components/schemas/Payout' }
 *                     starMatching:
 *                       type: object
 *                       properties:
 *                         dailyClosings: { type: number }
 *                         pendingStarsLeft: { type: number }
 *                         pendingStarsRight: { type: number }
 *                         accumulatedStars: { type: number, description: "Total lifetime stars matched" }
 *                         totalEarned: { type: number }
 *                         history:
 *                           type: array
 *                           items: { $ref: '#/components/schemas/Payout' }
 * */

/**
 * @swagger
 * /api/v1/user/fast-track-status:
 *   get:
 *     summary: Get Fast Track Bonus Status (User only)
 *     description: |
 *       **User Access Only** - Detailed stats for Fast Track Bonus (Daily Closings, Carry Forward, etc).
 *     tags: [User - Financial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fast Track status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     dailyClosings: { type: number, description: "Max 6 per day" }
 *                     lastClosingTime: { type: string, format: date-time }
 *                     pendingLeft: { type: number }
 *                     pendingRight: { type: number }
 *                     carryForwardLeft: { type: number }
 *                     carryForwardRight: { type: number }
 *                     totalEarned: { type: number }
 *                     overallTotalEarnings: { type: number, description: "Total Wallet Earnings" }
 *                     history:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Payout' }
 * */

/**
 * @swagger
 * /api/v1/user/star-matching-status:
 *   get:
 *     summary: Get Star Matching Bonus Status (User only)
 *     description: |
 *       **User Access Only** - Detailed stats for Star Matching Bonus (Daily Closings, Accumulated Stars, etc).
 *     tags: [User - Financial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Star Matching status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     dailyClosings: { type: number }
 *                     lastClosingTime: { type: string, format: date-time }
 *                     pendingLeft: { type: number, description: "Pending Stars Left" }
 *                     pendingRight: { type: number, description: "Pending Stars Right" }
 *                     carryForwardLeft: { type: number }
 *                     carryForwardRight: { type: number }
 *                     accumulatedStars: { type: number, description: "Total lifetime stars matched" }
 *                     totalEarned: { type: number }
 *                     history:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Payout' }
 * */

/**
 * @swagger
 * /api/v1/user/wallet:
 *   get:
 *     summary: Get wallet balance and payout history (User only)
 *     description: |
 *       **User Access Only** - View your wallet balance and complete payout/withdrawal history.
 *     tags: [User - Financial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet info fetched
 */

/**
 * @swagger
 * /api/v1/user/request-payout:
 *   post:
 *     summary: Request a withdrawal/payout (Disabled)
 *     description: |
 *       **DEPRECATED - Manual Payouts Disabled**
 *       
 *       Manual withdrawal requests are no longer accepted. 
 *       Payouts are automatically generated every **Friday at 12:00 AM (midnight) IST** for all eligible users.
 *       
 *       **Automatic Payout Eligibility:**
 *       - Wallet Available Balance >= Minimum Withdrawal (₹450)
 *       - KYC Status: **Verified** (mandatory)
 *       - User account must be active
 *       
 *       **Automatic Deductions:**
 *       - Admin Charge: 5%
 *       - TDS: 2%
 *       
 *       **Process:**
 *       - Every Friday 12 AM: System scans all users
 *       - Eligible users: Entire available balance is withdrawn automatically
 *       - Payout request created with status: 'pending'
 *       - Admin processes pending payouts manually
 *       
 *       **Note:** If you need to withdraw funds, ensure your KYC is verified and wait until Friday midnight.
 *     tags: [User - Financial]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number, description: "Ignored" }
 *     responses:
 *       403:
 *         description: Manual requests disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Forbidden'
 *             example:
 *               success: false
 *               statusCode: 403
 *               message: "Manual payout requests are disabled. Payouts are generated automatically on Friday nights."
 */

/**
 * @swagger
 * /api/v1/user/tree/{memberId}:
 *   get:
 *     summary: Fetch Genealogy Tree Structure (User only)
 *     description: |
 *       **User Access Only** - Returns a recursive tree structure (Left/Right) for the specified member.
 *       
 *       If no memberId is provided, returns tree starting from the logged-in user.
 *     tags: [User - Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: false
 *         schema:
 *           type: string
 *         example: SVS000001
 *     responses:
 *       200:
 *         description: Tree structure retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     memberId: { type: string }
 *                     fullName: { type: string }
 *                     rank: { type: string }
 *                     position: { type: string }
 *                     profileImage: { type: string }
 *                     sponsorId: { type: string }
 *                     joiningDate: { type: string, format: date-time }
 *                     status: { type: string, enum: [active, inactive, blocked] }
 *                     leftDirectActive: { type: integer }
 *                     leftDirectInactive: { type: integer }
 *                     rightDirectActive: { type: integer }
 *                     rightDirectInactive: { type: integer }
 *                     leftTeamCount: { type: integer, description: "Total recursive members in left leg" }
 *                     rightTeamCount: { type: integer, description: "Total recursive members in right leg" }

 *                     leftLegBV: { type: number, description: "Business Volume in left leg" }
 *                     rightLegBV: { type: number, description: "Business Volume in right leg" }
 *                     leftLegStars: { type: number, description: "Total accumulated stars in left leg" }
 *                     rightLegStars: { type: number, description: "Total accumulated stars in right leg" }
 *                     left: { type: object }
 *                     right: { type: object }
 */

/**
 * @swagger
 * /api/v1/user/tree_view:
 *   get:
 *     summary: Fetch Genealogy Tree - Simplified (User only)
 *     description: |
 *       **User Access Only** - Alias for fetching the tree structure. Supports optional depth parameter.
 *     tags: [User - Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: depth
 *         required: false
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Depth of the tree to retrieve (Unlimited)
 *     responses:
 *       200:
 *         description: Tree structure retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     memberId: { type: string }
 *                     fullName: { type: string }
 *                     rank: { type: string }
 *                     position: { type: string }
 *                     profileImage: { type: string }
 *                     sponsorId: { type: string }
 *                     joiningDate: { type: string, format: date-time }
 *                     status: { type: string, enum: [active, inactive, blocked] }
 *                     leftDirectActive: { type: integer }
 *                     leftDirectInactive: { type: integer }
 *                     rightDirectActive: { type: integer }
 *                     rightDirectInactive: { type: integer }
 *                     leftTeamCount: { type: integer, description: "Total recursive members in left leg" }
 *                     rightTeamCount: { type: integer, description: "Total recursive members in right leg" }
 *                     left: { type: object }
 *                     right: { type: object }
 */

/**
 * @swagger
 * /api/v1/user/payouts:
 *   get:
 *     summary: Get your payout history (User only)
 *     description: |
 *       **User Access Only** - View all your withdrawal requests and their statuses.
 *     tags: [User - Financial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payout history fetched
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
 */

/**
 * @swagger
 * /api/v1/user/direct-team:
 *   get:
 *     summary: Get Direct Team List (User only)
 *     description: |
 *       **User Access Only** - Retrieve a paginated list of directly sponsored members, optionally filtered by leg.
 *     tags: [User - Team]
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
 *           default: 10
 *       - in: query
 *         name: leg
 *         schema:
 *           type: string
 *           enum: [left, right]
 *         description: Filter by leg (optional)
 *     responses:
 *       200:
 *         description: Direct team fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     team:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId: { type: string }
 *                           fullName: { type: string }
 *                           currentRank: { type: string }
 *                           totalBV: { type: number }
 *                           joiningDate: { type: string, format: date-time }
 *                           status: { type: string }
 *                           sponsorLeg: { type: string }
 *                           leftTeamCount: { type: integer, description: "Total recursive members in left leg" }
 *                           rightTeamCount: { type: integer, description: "Total recursive members in right leg" }
 *                           profilePicture: { type: object, properties: { url: { type: string } } }
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total: { type: integer }
 *                         page: { type: integer }
 *                         limit: { type: integer }
 *                         pages: { type: integer }
 */

/**
 * @swagger
 * /api/v1/user/team/complete:
 *   get:
 *     summary: Get Complete Downline Team - Recursive (User only)
 *     description: |
 *       **User Access Only** - Retrieve all members in the specified leg (Left or Right), including indirect referrals.
 *     tags: [User - Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: leg
 *         required: true
 *         schema:
 *           type: string
 *           enum: [left, right]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Complete team fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     members:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId: { type: string }
 *                           fullName: { type: string }
 *                           rank: { type: string }
 *                           joiningDate: { type: string, format: date-time }
 *                           status: { type: string }
 *                           sponsorId: { type: string }
 *                           profilePicture: { type: string }
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total: { type: integer }
 *                         page: { type: integer }
 *                         limit: { type: integer }
 *                         pages: { type: integer }
 */

/**
 * @swagger
 * /api/v1/user/activate:
 *   post:
 *     summary: Activate user account with joining package (User only)
 *     description: |
 *       **User Access Only** - Activate your account by purchasing the joining package (500 BV).
 *     tags: [User - Account]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account activated successfully
 *       400:
 *         description: Already active or invalid request
 */
