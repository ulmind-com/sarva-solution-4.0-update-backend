/**
 * @swagger
 * tags:
 *   - name: User - Health & Education Bonus
 *     description: User-facing Health & Education Bonus APIs (50,000 BV = 1 Unit | No Capping | 5% Pool)
 *   - name: Admin - Health & Education Bonus
 *     description: Admin APIs for Health & Education Bonus management
 */

// ─────────────────────────────────────────────────────────────────────────────
// USER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/user/health-education-bonus/status:
 *   get:
 *     summary: Get my current month Health & Education Bonus status (User only)
 *     description: |
 *       Returns the authenticated user's live Health & Education Bonus breakdown for the current month.
 *
 *       **Rules:**
 *       - 50,000 BV = 1 Unit
 *       - No unit capping — unlimited units
 *       - Pool = 5% of company's monthly fresh BV
 *       - Personal BV always added to the weaker leg
 *       - Carry-forward: stronger leg surplus rolls to next month; weaker leg resets to 0
 *     tags: [User - Health & Education Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health & Education Bonus status fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Health & Education Bonus status fetched successfully" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentMonth:
 *                       type: object
 *                       properties:
 *                         year:  { type: number, example: 2026 }
 *                         month: { type: number, example: 6 }
 *                     carryForward:
 *                       type: object
 *                       properties:
 *                         left:  { type: number, example: 100000 }
 *                         right: { type: number, example: 0 }
 *                     bvBreakdown:
 *                       type: object
 *                       properties:
 *                         freshLeftBV:   { type: number, example: 150000 }
 *                         freshRightBV:  { type: number, example: 300000 }
 *                         carryLeftBV:   { type: number, example: 100000 }
 *                         carryRightBV:  { type: number, example: 0 }
 *                         totalLeftBV:   { type: number, example: 250000 }
 *                         totalRightBV:  { type: number, example: 300000 }
 *                         personalBV:    { type: number, example: 10000 }
 *                         adjustedLeft:  { type: number, example: 260000 }
 *                         adjustedRight: { type: number, example: 300000 }
 *                         weakerSide:    { type: string,  example: "left" }
 *                     units:
 *                       type: object
 *                       properties:
 *                         estimated: { type: number, example: 5 }
 *                         bvPerUnit:  { type: number, example: 50000 }
 *                         noCapping:  { type: boolean, example: true }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/health-education-bonus/history:
 *   get:
 *     summary: Get my Health & Education Bonus payout history (User only)
 *     tags: [User - Health & Education Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History fetched successfully
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
 *                       month:        { type: number, example: 6 }
 *                       finalUnits:   { type: number, example: 9 }
 *                       grossCredit:  { type: number, example: 45000 }
 *                       adminCharge:  { type: number, example: 2250 }
 *                       tds:          { type: number, example: 900 }
 *                       netCredit:    { type: number, example: 41850 }
 *                       creditedAt:   { type: string, format: date-time }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/health-education-bonus/live-estimate:
 *   get:
 *     summary: Get my real-time Health & Education Bonus earning estimate (User only)
 *     tags: [User - Health & Education Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Live estimate fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     companyBV:
 *                       type: object
 *                       properties:
 *                         totalBV:     { type: number, example: 10000000 }
 *                         poolPercent: { type: number, example: 5 }
 *                         poolAmount:  { type: number, example: 500000 }
 *                     pool:
 *                       type: object
 *                       properties:
 *                         totalUnits:    { type: number, example: 100 }
 *                         perUnitValue:  { type: number, example: 5000 }
 *                         eligibleUsers: { type: number, example: 12 }
 *                     myEstimate:
 *                       type: object
 *                       properties:
 *                         myUnits:       { type: number, example: 9 }
 *                         bvPerUnit:     { type: number, example: 50000 }
 *                         noCapping:     { type: boolean, example: true }
 *                         grossEarning:  { type: number, example: 45000 }
 *                         deduction7pct: { type: number, example: 3150 }
 *                         netEarning:    { type: number, example: 41850 }
 */

/**
 * @swagger
 * /api/v1/user/health-education-bonus/status/{memberId}:
 *   get:
 *     summary: Get Health & Education Bonus status for any member (Public)
 *     tags: [User - Health & Education Bonus]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 */

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/health-education-bonus/live-pool:
 *   get:
 *     summary: Real-time Health & Education Bonus pool for current month (Admin)
 *     description: |
 *       **Admin Access Only** — Live pool preview. Company BV, 5% pool amount, all eligible users' unit counts + estimated gross/net earnings.
 *       **No DB writes.** Numbers update live as company BV grows.
 *
 *       Each user entry in `users[]` contains exactly the same columns as the Current Month Live Tracker:
 *       User | Total Left BV | Total Right BV | Self BV (Add-on) | Adjusted Weaker Leg | Projected Units | Est. Net Final (₹)
 *     tags: [Admin - Health & Education Bonus]
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
 *                         month: { type: number, example: 6 }
 *                     pool:
 *                       type: object
 *                       properties:
 *                         companyTotalBV:    { type: number, example: 10000000 }
 *                         poolPercent:       { type: number, example: 5 }
 *                         poolAmount:        { type: number, example: 500000 }
 *                         totalUnits:        { type: number, example: 100 }
 *                         perUnitValue:      { type: number, example: 5000 }
 *                         eligibleUserCount: { type: number, example: 12 }
 *                     users:
 *                       type: array
 *                       description: Sorted by estimatedNet descending
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId:           { type: string,  example: "SVS000001" }
 *                           fullName:           { type: string,  example: "Soumyajit Roy" }
 *                           leftBV:             { type: number,  example: 550000, description: "Total Left BV (fresh + carry-forward)" }
 *                           rightBV:            { type: number,  example: 430000, description: "Total Right BV (fresh + carry-forward)" }
 *                           personalBV:         { type: number,  example: 20000,  description: "Self BV (Add-on) added to weaker leg" }
 *                           adjustedLeft:       { type: number,  example: 550000 }
 *                           adjustedRight:      { type: number,  example: 450000 }
 *                           weakerSide:         { type: string,  example: "right" }
 *                           adjustedWeakerLeg:  { type: number,  example: 450000, description: "Adjusted Weaker Leg — value used for unit calculation" }
 *                           finalUnits:         { type: number,  example: 9, description: "floor(450000 / 50000) = 9, no cap" }
 *                           estimatedGross:     { type: number,  example: 45000 }
 *                           estimatedNet:       { type: number,  example: 41850, description: "gross × 0.93" }
 */

/**
 * @swagger
 * /api/v1/admin/health-education-bonus/pools:
 *   get:
 *     summary: List all monthly Health & Education Bonus pools (Admin)
 *     description: Paginated list of all monthly pool records, most recent first.
 *     tags: [Admin - Health & Education Bonus]
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
 *                     pools: { type: array, items: { type: object } }
 *                     total: { type: number, example: 1 }
 *                     page:  { type: number, example: 1 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/health-education-bonus/pools/{year}/{month}:
 *   get:
 *     summary: Get full Health & Education Bonus pool detail for a specific month (Admin)
 *     description: Returns the pool record and every user's credit breakdown for a given month.
 *     tags: [Admin - Health & Education Bonus]
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
 *         schema: { type: integer, example: 6 }
 *     responses:
 *       200:
 *         description: Pool detail fetched successfully
 *       404:
 *         description: No pool found for this month
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/health-education-bonus/users:
 *   get:
 *     summary: List all active users with current-month Health & Education Bonus unit estimates (Admin)
 *     description: |
 *       Returns every active user's BV breakdown and projected units for the current month.
 *       Sorted by estimated units descending.
 *
 *       Columns: User | Total Left BV | Total Right BV | Self BV (Add-on) | Adjusted Weaker Leg | Projected Units
 *     tags: [Admin - Health & Education Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview fetched successfully
 */

/**
 * @swagger
 * /api/v1/admin/health-education-bonus/users/{memberId}:
 *   get:
 *     summary: Get full Health & Education Bonus detail for a specific user (Admin)
 *     description: Returns full payout history, current carry-forward state, and current-month estimate for one user.
 *     tags: [Admin - Health & Education Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User detail fetched successfully
 *       404:
 *         description: Member not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/health-education-bonus/trigger:
 *   post:
 *     summary: Manually trigger Health & Education Bonus month-end computation (Admin)
 *     description: |
 *       Runs month-end unit computation for all users and stages wallet credit records.
 *       Does NOT credit wallets yet — use `/apply-credits` for that.
 *     tags: [Admin - Health & Education Bonus]
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
 *               month: { type: integer, example: 6 }
 *     responses:
 *       200:
 *         description: Distribution staged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Health & Education Bonus distribution staged for 2026-6" }
 */

/**
 * @swagger
 * /api/v1/admin/health-education-bonus/apply-credits:
 *   post:
 *     summary: Apply pending Health & Education Bonus wallet credits (Admin)
 *     description: |
 *       Credits all user wallets for a given month's staged distribution.
 *       Normally runs automatically on the 1st of each month at 00:00 IST.
 *     tags: [Admin - Health & Education Bonus]
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
 *               month: { type: integer, example: 6 }
 *     responses:
 *       200:
 *         description: Wallet credits applied successfully
 *       400:
 *         description: Invalid year or month
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
