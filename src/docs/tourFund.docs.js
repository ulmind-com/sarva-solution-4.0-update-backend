/**
 * @swagger
 * tags:
 *   - name: User - Tour Fund
 *     description: User-facing Tour Fund APIs (25,000 BV = 1 Unit | No Capping | 6% Pool)
 *   - name: Admin - Tour Fund
 *     description: Admin APIs for Tour Fund management
 */

/**
 * @swagger
 * /api/v1/user/tour-fund/status:
 *   get:
 *     description: |
 *       Returns the authenticated user's live Tour Fund breakdown for the current month.
 *
 *       **Rules:**
 *       - 25,000 BV = 1 Unit
 *       - No unit capping — unlimited units
 *       - Pool = 6% of company's monthly fresh BV
 *       - Personal BV always added to the weaker leg
 *       - Carry-forward: stronger leg surplus rolls to next month; weaker leg resets to 0
 *     tags: [User - Tour Fund]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tour Fund status fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Tour Fund status fetched successfully" }
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
 *                         left:  { type: number, example: 50000 }
 *                         right: { type: number, example: 0 }
 *                     bvBreakdown:
 *                       type: object
 *                       properties:
 *                         freshLeftBV:   { type: number, example: 60000 }
 *                         freshRightBV:  { type: number, example: 130000 }
 *                         carryLeftBV:   { type: number, example: 50000 }
 *                         carryRightBV:  { type: number, example: 0 }
 *                         totalLeftBV:   { type: number, example: 110000 }
 *                         totalRightBV:  { type: number, example: 130000 }
 *                         personalBV:    { type: number, example: 5000 }
 *                         adjustedLeft:  { type: number, example: 115000 }
 *                         adjustedRight: { type: number, example: 130000 }
 *                         weakerSide:    { type: string,  example: "left" }
 *                     units:
 *                       type: object
 *                       properties:
 *                         estimated: { type: number, example: 4, description: "floor(115000 / 25000) = 4" }
 *                         bvPerUnit:  { type: number, example: 25000 }
 *                         noCapping:  { type: boolean, example: true }
 */

/**
 * @swagger
 * /api/v1/user/tour-fund/history:
 *   get:
 *     summary: Get my Tour Fund payout history (User only)
 *     tags: [User - Tour Fund]
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
 *                       grossCredit:  { type: number, example: 40500 }
 *                       adminCharge:  { type: number, example: 2025 }
 *                       tds:          { type: number, example: 810 }
 *                       netCredit:    { type: number, example: 37665 }
 *                       creditedAt:   { type: string, format: date-time }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/tour-fund/live-estimate:
 *   get:
 *     summary: Get my real-time Tour Fund earning estimate (User only)
 *     description: Live estimate based on current month company BV. Updates throughout the month.
 *     tags: [User - Tour Fund]
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
 *                         totalBV:     { type: number, example: 3000000 }
 *                         poolPercent: { type: number, example: 6 }
 *                         poolAmount:  { type: number, example: 180000 }
 *                     pool:
 *                       type: object
 *                       properties:
 *                         totalUnits:    { type: number, example: 40 }
 *                         perUnitValue:  { type: number, example: 4500 }
 *                         eligibleUsers: { type: number, example: 6 }
 *                     myEstimate:
 *                       type: object
 *                       properties:
 *                         myUnits:       { type: number, example: 9 }
 *                         bvPerUnit:     { type: number, example: 25000 }
 *                         noCapping:     { type: boolean, example: true }
 *                         grossEarning:  { type: number, example: 40500 }
 *                         deduction7pct: { type: number, example: 2835 }
 *                         netEarning:    { type: number, example: 37665 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/tour-fund/live-pool:
 *   get:
 *     summary: Real-time Tour Fund pool preview (Admin)
 *     tags: [Admin - Tour Fund]
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
 *                         companyTotalBV:    { type: number, example: 3000000 }
 *                         poolPercent:       { type: number, example: 6 }
 *                         poolAmount:        { type: number, example: 180000 }
 *                         totalUnits:        { type: number, example: 40 }
 *                         perUnitValue:      { type: number, example: 4500 }
 *                         eligibleUserCount: { type: number, example: 6 }
 *                     users:
 *                       type: array
 *                       description: Sorted by estimatedNet descending
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId:           { type: string,  example: "SVS000001" }
 *                           fullName:           { type: string,  example: "Soumyajit Roy" }
 *                           leftBV:             { type: number,  example: 280000, description: "Total Left BV (fresh + carry-forward)" }
 *                           rightBV:            { type: number,  example: 215000, description: "Total Right BV (fresh + carry-forward)" }
 *                           personalBV:         { type: number,  example: 15000,   description: "Self BV (Add-on) added to weaker leg" }
 *                           adjustedLeft:       { type: number,  example: 280000 }
 *                           adjustedRight:      { type: number,  example: 230000 }
 *                           weakerSide:         { type: string,  example: "right" }
 *                           adjustedWeakerLeg:  { type: number,  example: 230000, description: "Adjusted Weaker Leg — used for unit calculation" }
 *                           finalUnits:         { type: number,  example: 9,     description: "floor(230000 / 25000) = 9, no cap" }
 *                           estimatedGross:     { type: number,  example: 40500 }
 *                           estimatedNet:       { type: number,  example: 37665,  description: "gross × 0.93" }
 */

/**
 * @swagger
 * /api/v1/admin/tour-fund/pools:
 *   get:
 *     summary: List all monthly Tour Fund pools (Admin)
 *     tags: [Admin - Tour Fund]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */

/**
 * @swagger
 * /api/v1/admin/tour-fund/pools/{year}/{month}:
 *   get:
 *     summary: Get full Tour Fund pool detail for a specific month (Admin)
 *     tags: [Admin - Tour Fund]
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
 * /api/v1/admin/tour-fund/users:
 *   get:
 *     summary: List all active users with current-month Tour Fund unit estimates (Admin)
 *     description: |
 *       Columns: User | Total Left BV | Total Right BV | Self BV (Add-on) | Adjusted Weaker Leg | Projected Units
 *     tags: [Admin - Tour Fund]
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
 *                 success: { type: boolean, example: true }
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
 *                           leftBV:            { type: number, example: 280000, description: "Total Left BV" }
 *                           rightBV:           { type: number, example: 215000, description: "Total Right BV" }
 *                           personalBV:        { type: number, example: 15000,   description: "Self BV (Add-on)" }
 *                           adjustedLeft:      { type: number, example: 280000 }
 *                           adjustedRight:     { type: number, example: 230000 }
 *                           weakerSide:        { type: string, example: "right" }
 *                           adjustedWeakerLeg: { type: number, example: 230000, description: "Adjusted Weaker Leg" }
 *                           estimatedUnits:    { type: number, example: 9, description: "floor(adjustedWeakerLeg / 25000)" }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/tour-fund/users/{memberId}:
 *   get:
 *     summary: Get full Tour Fund detail for a specific user (Admin)
 *     tags: [Admin - Tour Fund]
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
 * /api/v1/admin/tour-fund/trigger:
 *   post:
 *     summary: Manually trigger Tour Fund month-end computation (Admin)
 *     description: Computes units for all users and stages wallet credit records. Does NOT credit wallets yet.
 *     tags: [Admin - Tour Fund]
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
 *                 message: { type: string, example: "Tour Fund distribution staged successfully" }
 *       400:
 *         description: Invalid year or month
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/tour-fund/apply-credits:
 *   post:
 *     summary: Apply pending Tour Fund wallet credits (Admin)
 *     description: Credits all user wallets for a staged month. Runs automatically on 1st of month at 00:15 IST.
 *     tags: [Admin - Tour Fund]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Wallet credits applied successfully" }
 *       400:
 *         description: Invalid year or month
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
