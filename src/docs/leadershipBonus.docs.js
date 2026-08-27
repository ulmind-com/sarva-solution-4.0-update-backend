/**
 * @swagger
 * tags:
 *   - name: User - Leadership Bonus
 *     description: User-facing Leadership Bonus APIs (12,000 BV = 1 Unit | No Capping | 12% Pool)
 *   - name: Admin - Leadership Bonus
 *     description: Admin APIs for Leadership Bonus management
 */

// ─────────────────────────────────────────────────────────────────────────────
// USER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/user/leadership-bonus/status:
 *   get:
 *     summary: Get my current month Leadership Bonus status (User only)
 *     description: |
 *       Returns the authenticated user's live Leadership Bonus breakdown for the current month.
 *
 *       **Rules:**
 *       - 12,000 BV = 1 Unit
 *       - No unit capping — unlimited units
 *       - Pool = 12% of company's monthly fresh BV
 *       - Personal BV always added to the weaker leg
 *       - Carry-forward: stronger leg surplus rolls to next month; weaker leg resets to 0
 *     tags: [User - Leadership Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leadership Bonus status fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Leadership Bonus status fetched successfully" }
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
 *                         left:  { type: number, example: 40000 }
 *                         right: { type: number, example: 0 }
 *                     bvBreakdown:
 *                       type: object
 *                       properties:
 *                         freshLeftBV:   { type: number, example: 180000 }
 *                         freshRightBV:  { type: number, example: 135000 }
 *                         carryLeftBV:   { type: number, example: 0 }
 *                         carryRightBV:  { type: number, example: 0 }
 *                         totalLeftBV:   { type: number, example: 180000 }
 *                         totalRightBV:  { type: number, example: 135000 }
 *                         personalBV:    { type: number, example: 5000 }
 *                         adjustedLeft:  { type: number, example: 180000 }
 *                         adjustedRight: { type: number, example: 140000 }
 *                         weakerSide:    { type: string,  example: "right" }
 *                     units:
 *                       type: object
 *                       properties:
 *                         estimated: { type: number, example: 11, description: "floor(140000 / 12000) = 11" }
 *                         bvPerUnit:  { type: number, example: 12000 }
 *                         noCapping:  { type: boolean, example: true }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/leadership-bonus/history:
 *   get:
 *     summary: Get my Leadership Bonus payout history (User only)
 *     tags: [User - Leadership Bonus]
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
 *                       finalUnits:   { type: number, example: 11 }
 *                       grossCredit:  { type: number, example: 44000 }
 *                       adminCharge:  { type: number, example: 2200 }
 *                       tds:          { type: number, example: 880 }
 *                       netCredit:    { type: number, example: 40920 }
 *                       creditedAt:   { type: string, format: date-time }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/leadership-bonus/live-estimate:
 *   get:
 *     summary: Get my real-time Leadership Bonus earning estimate (User only)
 *     description: Live estimate based on current month company BV. Updates throughout the month.
 *     tags: [User - Leadership Bonus]
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
 *                         totalBV:     { type: number, example: 1500000 }
 *                         poolPercent: { type: number, example: 12 }
 *                         poolAmount:  { type: number, example: 180000 }
 *                     pool:
 *                       type: object
 *                       properties:
 *                         totalUnits:    { type: number, example: 45 }
 *                         perUnitValue:  { type: number, example: 4000 }
 *                         eligibleUsers: { type: number, example: 6 }
 *                     myEstimate:
 *                       type: object
 *                       properties:
 *                         myUnits:       { type: number, example: 11 }
 *                         bvPerUnit:     { type: number, example: 12000 }
 *                         noCapping:     { type: boolean, example: true }
 *                         grossEarning:  { type: number, example: 44000 }
 *                         deduction7pct: { type: number, example: 3080 }
 *                         netEarning:    { type: number, example: 40920 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/leadership-bonus/status/{memberId}:
 *   get:
 *     summary: Get Leadership Bonus status for any member (Public)
 *     description: No authentication required. Retrieve any member's current Leadership Bonus breakdown.
 *     tags: [User - Leadership Bonus]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *         description: Member ID (e.g. SVS000002)
 *     responses:
 *       200:
 *         description: Status fetched
 *       404:
 *         description: Member not found
 */

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/leadership-bonus/live-pool:
 *   get:
 *     summary: Real-time Leadership Bonus pool for current month (Admin)
 *     description: |
 *       **Admin Access Only** — Live pool preview. No DB writes.
 *       Shows company BV, 12% pool amount, and all eligible users' full breakdown.
 *
 *       Columns: User | Total Left BV | Total Right BV | Self BV (Add-on) | Adjusted Weaker Leg | Projected Units | Est. Net Final (₹)
 *     tags: [Admin - Leadership Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Live pool fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                         companyTotalBV:    { type: number, example: 1500000 }
 *                         poolPercent:       { type: number, example: 12 }
 *                         poolAmount:        { type: number, example: 180000 }
 *                         totalUnits:        { type: number, example: 45 }
 *                         perUnitValue:      { type: number, example: 4000 }
 *                         eligibleUserCount: { type: number, example: 6 }
 *                     users:
 *                       type: array
 *                       description: Sorted by estimatedNet descending
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId:           { type: string,  example: "SVS000001" }
 *                           fullName:           { type: string,  example: "Soumyajit Roy" }
 *                           leftBV:             { type: number,  example: 180000, description: "Total Left BV (fresh + carry-forward)" }
 *                           rightBV:            { type: number,  example: 135000, description: "Total Right BV (fresh + carry-forward)" }
 *                           personalBV:         { type: number,  example: 5000,   description: "Self BV (Add-on) added to weaker leg" }
 *                           adjustedLeft:       { type: number,  example: 180000 }
 *                           adjustedRight:      { type: number,  example: 140000 }
 *                           weakerSide:         { type: string,  example: "right" }
 *                           adjustedWeakerLeg:  { type: number,  example: 140000, description: "Adjusted Weaker Leg — used for unit calculation" }
 *                           finalUnits:         { type: number,  example: 11,     description: "floor(140000 / 12000) = 11, no cap" }
 *                           estimatedGross:     { type: number,  example: 44000 }
 *                           estimatedNet:       { type: number,  example: 40920,  description: "gross × 0.93" }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/leadership-bonus/pools:
 *   get:
 *     summary: List all monthly Leadership Bonus pools (Admin)
 *     description: Paginated list, most recent first.
 *     tags: [Admin - Leadership Bonus]
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
 *         description: Pool list fetched
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/leadership-bonus/pools/{year}/{month}:
 *   get:
 *     summary: Get full Leadership Bonus pool detail for a specific month (Admin)
 *     tags: [Admin - Leadership Bonus]
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
 *         description: Pool detail fetched
 *       404:
 *         description: No pool found for this month
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/leadership-bonus/users:
 *   get:
 *     summary: List all active users with current-month Leadership Bonus unit estimates (Admin)
 *     description: |
 *       Columns: User | Total Left BV | Total Right BV | Self BV (Add-on) | Adjusted Weaker Leg | Projected Units
 *     tags: [Admin - Leadership Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     year:  { type: number, example: 2026 }
 *                     month: { type: number, example: 6 }
 *                     users:
 *                       type: array
 *                       description: Sorted by estimatedUnits descending
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId:          { type: string, example: "SVS000001" }
 *                           fullName:          { type: string, example: "Soumyajit Roy" }
 *                           leftBV:            { type: number, example: 180000, description: "Total Left BV" }
 *                           rightBV:           { type: number, example: 135000, description: "Total Right BV" }
 *                           personalBV:        { type: number, example: 5000,   description: "Self BV (Add-on)" }
 *                           adjustedLeft:      { type: number, example: 180000 }
 *                           adjustedRight:     { type: number, example: 140000 }
 *                           weakerSide:        { type: string, example: "right" }
 *                           adjustedWeakerLeg: { type: number, example: 140000, description: "Adjusted Weaker Leg" }
 *                           estimatedUnits:    { type: number, example: 11, description: "floor(adjustedWeakerLeg / 12000)" }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/leadership-bonus/users/{memberId}:
 *   get:
 *     summary: Get full Leadership Bonus detail for a specific user (Admin)
 *     tags: [Admin - Leadership Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User detail fetched
 *       404:
 *         description: Member not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/leadership-bonus/trigger:
 *   post:
 *     summary: Manually trigger Leadership Bonus month-end computation (Admin)
 *     description: Computes units for all users and stages wallet credit records. Does NOT credit wallets yet.
 *     tags: [Admin - Leadership Bonus]
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
 *                 message: { type: string, example: "Leadership Bonus distribution staged successfully" }
 */

/**
 * @swagger
 * /api/v1/admin/leadership-bonus/apply-credits:
 *   post:
 *     summary: Apply pending Leadership Bonus wallet credits (Admin)
 *     description: Credits all user wallets for a staged month. Runs automatically on 1st of month at 00:10 IST.
 *     tags: [Admin - Leadership Bonus]
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
