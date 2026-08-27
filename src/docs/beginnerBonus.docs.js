/**
 * @swagger
 * tags:
 *   - name: User - Beginner Bonus
 *     description: User-facing Beginner Bonus APIs
 *   - name: Admin - Beginner Bonus
 *     description: Admin APIs for Beginner Bonus management
 */

// ─────────────────────────────────────────────────────────────────────────────
// USER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/user/beginner-bonus/status:
 *   get:
 *     summary: Get my current month Beginner Bonus status (User only)
 *     description: |
 *       **User Access Only** — Returns the authenticated user's live Beginner Bonus breakdown for the current month.
 *       Includes fresh BV from both legs, carry-forward from last month, personal BV add-on direction, adjusted totals, and estimated unit count.
 *     tags: [User - Beginner Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Beginner Bonus status fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Beginner Bonus status fetched successfully" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentMonth:
 *                       type: object
 *                       properties:
 *                         year:  { type: number, example: 2026 }
 *                         month: { type: number, example: 3 }
 *                     carryForward:
 *                       type: object
 *                       properties:
 *                         left:  { type: number, example: 1000 }
 *                         right: { type: number, example: 0 }
 *                     bvBreakdown:
 *                       type: object
 *                       properties:
 *                         freshLeftBV:   { type: number, example: 8000 }
 *                         freshRightBV:  { type: number, example: 7000 }
 *                         carryLeftBV:   { type: number, example: 1000 }
 *                         carryRightBV:  { type: number, example: 0 }
 *                         totalLeftBV:   { type: number, example: 9000 }
 *                         totalRightBV:  { type: number, example: 7000 }
 *                         personalBV:    { type: number, example: 2000 }
 *                         adjustedLeft:  { type: number, example: 9000 }
 *                         adjustedRight: { type: number, example: 9000 }
 *                         weakerSide:    { type: string, example: "right" }
 *                     units:
 *                       type: object
 *                       properties:
 *                         estimated:      { type: number, example: 9 }
 *                         cappingLimit:   { type: number, example: 10 }
 *                         cappingReached: { type: boolean, example: false }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/beginner-bonus/history:
 *   get:
 *     summary: Get my Beginner Bonus payout history (User only)
 *     description: |
 *       **User Access Only** — Returns all historical Beginner Bonus payouts for the authenticated user, sorted most-recent first.
 *       Each record shows unit breakdown, pool values, gross credit, deductions, and net credit.
 *     tags: [User - Beginner Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Beginner Bonus history fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       year:         { type: number, example: 2026 }
 *                       month:        { type: number, example: 2 }
 *                       finalUnits:   { type: number, example: 7 }
 *                       grossCredit:  { type: number, example: 2121.0 }
 *                       adminCharge:  { type: number, example: 106.05 }
 *                       tds:          { type: number, example: 42.42 }
 *                       netCredit:    { type: number, example: 1972.53 }
 *                       creditedAt:   { type: string, format: date-time }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/beginner-bonus/status/{memberId}:
 *   get:
 *     summary: Get Beginner Bonus status for any member (Public)
 *     description: |
 *       **Public Access** — Retrieve the current Beginner Bonus breakdown for any member by their Member ID. No authentication required.
 *     tags: [User - Beginner Bonus]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: Member ID (e.g. SVS000001)
 *     responses:
 *       200:
 *         description: Beginner Bonus status fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *       404:
 *         description: Member not found
 */

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/beginner-bonus/pools:
 *   get:
 *     summary: List all monthly Beginner Bonus pools (Admin)
 *     description: Paginated list of all monthly pool records, most recent first.
 *     tags: [Admin - Beginner Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *     responses:
 *       200:
 *         description: Pool list fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     pools:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           year:              { type: number, example: 2026 }
 *                           month:             { type: number, example: 3 }
 *                           companyTotalBV:    { type: number, example: 50000 }
 *                           poolAmount:        { type: number, example: 9000 }
 *                           totalUnits:        { type: number, example: 42 }
 *                           perUnitValue:      { type: number, example: 214.29 }
 *                           eligibleUserCount: { type: number, example: 8 }
 *                           status:            { type: string, example: "distributed" }
 *                     total: { type: number, example: 12 }
 *                     page:  { type: number, example: 1 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /api/v1/admin/beginner-bonus/pools/{year}/{month}:
 *   get:
 *     summary: Get full pool detail for a specific month (Admin)
 *     description: Returns the pool record and every user's credit breakdown for a given month.
 *     tags: [Admin - Beginner Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema: { type: integer, example: 2026 }
 *       - in: path
 *         name: month
 *         required: true
 *         schema: { type: integer, example: 3 }
 *     responses:
 *       200:
 *         description: Pool detail fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *       404:
 *         description: No pool found for this month
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/beginner-bonus/users:
 *   get:
 *     summary: List all active users with current-month unit estimates (Admin)
 *     description: |
 *       Returns every active user's current-month left/right BV breakdown, personal BV, adjusted totals, and estimated units.
 *       Sorted by estimated units descending. Use this to preview the pool before month-end closes.
 *     tags: [Admin - Beginner Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     year:  { type: number, example: 2026 }
 *                     month: { type: number, example: 3 }
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId:       { type: string, example: "SVS000001" }
 *                           fullName:       { type: string, example: "Super Admin" }
 *                           leftBV:         { type: number, example: 12000 }
 *                           rightBV:        { type: number, example: 9000 }
 *                           personalBV:     { type: number, example: 2000 }
 *                           adjustedLeft:   { type: number, example: 12000 }
 *                           adjustedRight:  { type: number, example: 11000 }
 *                           weakerSide:     { type: string, example: "right" }
 *                           adjustedWeakerLeg: { type: number, example: 11000 }
 *                           estimatedUnits: { type: number, example: 10 }
 *                           cappingReached: { type: boolean, example: true }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/beginner-bonus/users/{memberId}:
 *   get:
 *     summary: Get full Beginner Bonus detail for a specific user (Admin)
 *     description: Returns full payout history, current carry-forward state, and current-month estimate for one user.
 *     tags: [Admin - Beginner Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: Member ID of the user to inspect
 *     responses:
 *       200:
 *         description: User detail fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *       404:
 *         description: Member not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/beginner-bonus/trigger:
 *   post:
 *     summary: Manually trigger Beginner Bonus month-end computation (Admin)
 *     description: |
 *       Manually runs the month-end unit computation and carry-forward update for a given year/month.
 *       Creates or updates the pool record and creates wallet credit records (but does NOT credit wallets yet — use apply-credits for that).
 *     tags: [Admin - Beginner Bonus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [year, month]
 *             properties:
 *               year:  { type: integer, example: 2026 }
 *               month: { type: integer, example: 3 }
 *     responses:
 *       200:
 *         description: Distribution staged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Beginner Bonus distribution staged successfully" }
 *       400:
 *         description: Invalid year or month
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/beginner-bonus/apply-credits:
 *   post:
 *     summary: Apply pending Beginner Bonus wallet credits (Admin)
 *     description: |
 *       Credits all user wallets for a specific month's staged Beginner Bonus distribution.
 *       Normally runs automatically on the 1st of each month at 00:00 IST. Use this for manual or retry execution.
 *     tags: [Admin - Beginner Bonus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [year, month]
 *             properties:
 *               year:  { type: integer, example: 2026 }
 *               month: { type: integer, example: 3 }
 *     responses:
 *       200:
 *         description: Wallet credits applied successfully
 *       400:
 *         description: Invalid year or month
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/beginner-bonus/live-estimate:
 *   get:
 *     summary: Get my real-time Beginner Bonus earning estimate (User only)
 *     description: |
 *       **User Access Only** — Returns the logged-in user's current live earning estimate based on the current month's company BV and all users' unit counts.
 *       The `netEarning` value changes dynamically as company BV grows and as more users earn units throughout the month.
 *       Use this to give users a real-time preview of what they will receive on the 1st of next month.
 *     tags: [User - Beginner Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Live estimate fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentMonth:
 *                       type: object
 *                       properties:
 *                         year:  { type: number, example: 2026 }
 *                         month: { type: number, example: 3 }
 *                     companyBV:
 *                       type: object
 *                       properties:
 *                         totalBV:      { type: number, example: 3420 }
 *                         poolPercent:  { type: number, example: 18 }
 *                         poolAmount:   { type: number, example: 615.60 }
 *                     pool:
 *                       type: object
 *                       properties:
 *                         totalUnits:    { type: number, example: 5 }
 *                         perUnitValue:  { type: number, example: 123.12 }
 *                         eligibleUsers: { type: number, example: 3 }
 *                     myEstimate:
 *                       type: object
 *                       properties:
 *                         myUnits:        { type: number, example: 1 }
 *                         cappingLimit:   { type: number, example: 10 }
 *                         cappingReached: { type: boolean, example: false }
 *                         grossEarning:   { type: number, example: 123.12 }
 *                         deduction7pct:  { type: number, example: 8.62 }
 *                         netEarning:     { type: number, example: 114.50 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/beginner-bonus/live-pool:
 *   get:
 *     summary: Get real-time Beginner Bonus pool for current month (Admin)
 *     description: |
 *       **Admin Access Only** — Real-time full pool preview for the current month.
 *       Computes company BV, 18% pool amount, total units across all eligible users, per-unit value, and each user's estimated gross + net earning.
 *       **No DB writes.** Use this at any point in the month to see the live picture of who earns how much.
 *
 *       Each user entry in `users[]` contains exactly the same columns as the Current Month Live Tracker:
 *       User | Total Left BV | Total Right BV | Self BV (Add-on) | Adjusted Weaker Leg | Projected Units | Est. Net Final (₹)
 *     tags: [Admin - Beginner Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Live pool fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentMonth:
 *                       type: object
 *                       properties:
 *                         year:  { type: number, example: 2026 }
 *                         month: { type: number, example: 3 }
 *                     pool:
 *                       type: object
 *                       properties:
 *                         companyTotalBV:    { type: number, example: 3420 }
 *                         poolPercent:       { type: number, example: 18 }
 *                         poolAmount:        { type: number, example: 615.60 }
 *                         totalUnits:        { type: number, example: 5 }
 *                         perUnitValue:      { type: number, example: 123.12 }
 *                         eligibleUserCount: { type: number, example: 3 }
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId:       { type: string, example: "SVS000001" }
 *                           fullName:       { type: string, example: "Super Admin" }
 *                           leftBV:         { type: number, example: 6000 }
 *                           rightBV:        { type: number, example: 5000 }
 *                           personalBV:     { type: number, example: 2000 }
 *                           adjustedLeft:   { type: number, example: 6000 }
 *                           adjustedRight:  { type: number, example: 7000 }
 *                           weakerSide:     { type: string, example: "left" }
 *                           adjustedWeakerLeg: { type: number, example: 6000 }
 *                           finalUnits:     { type: number, example: 6 }
 *                           cappingReached: { type: boolean, example: false }
 *                           estimatedGross: { type: number, example: 738.72 }
 *                           estimatedNet:   { type: number, example: 687.01 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
