/**
 * @swagger
 * tags:
 *   - name: User - Start Up Bonus
 *     description: User-facing Start Up Bonus APIs (5000 BV = 1 Unit, No Capping)
 *   - name: Admin - Start Up Bonus
 *     description: Admin APIs for Start Up Bonus management
 */

// ─────────────────────────────────────────────────────────────────────────────
// USER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/user/startup-bonus/status:
 *   get:
 *     summary: Get my current month Start Up Bonus status (User only)
 *     description: |
 *       **User Access Only** — Returns the authenticated user's live Start Up Bonus breakdown for the current month.
 *       Includes fresh BV from both legs, carry-forward from last month, personal BV add-on direction, adjusted totals, and estimated unit count.
 *
 *       **Key Rule Differences from Beginner Bonus:**
 *       - 5000 BV = 1 Unit (not 1000)
 *       - No unit capping — you receive full units however many you earn
 *     tags: [User - Start Up Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Start Up Bonus status fetched successfully
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
 *                     carryForward:
 *                       type: object
 *                       properties:
 *                         left:  { type: number, example: 19000 }
 *                         right: { type: number, example: 0 }
 *                     bvBreakdown:
 *                       type: object
 *                       properties:
 *                         freshLeftBV:   { type: number, example: 85000 }
 *                         freshRightBV:  { type: number, example: 62000 }
 *                         carryLeftBV:   { type: number, example: 0 }
 *                         carryRightBV:  { type: number, example: 0 }
 *                         totalLeftBV:   { type: number, example: 85000 }
 *                         totalRightBV:  { type: number, example: 62000 }
 *                         personalBV:    { type: number, example: 4000 }
 *                         adjustedLeft:  { type: number, example: 85000 }
 *                         adjustedRight: { type: number, example: 66000 }
 *                         weakerSide:    { type: string, example: "right" }
 *                     units:
 *                       type: object
 *                       properties:
 *                         estimated: { type: number, example: 13 }
 *                         bvPerUnit:  { type: number, example: 5000 }
 *                         noCapping:  { type: boolean, example: true }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/startup-bonus/history:
 *   get:
 *     summary: Get my Start Up Bonus payout history (User only)
 *     description: |
 *       **User Access Only** — Returns all historical Start Up Bonus payouts for the authenticated user, sorted most-recent first.
 *     tags: [User - Start Up Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Start Up Bonus history fetched successfully
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
 *                       month:        { type: number, example: 3 }
 *                       finalUnits:   { type: number, example: 13 }
 *                       grossCredit:  { type: number, example: 19500.0 }
 *                       adminCharge:  { type: number, example: 975.0 }
 *                       tds:          { type: number, example: 390.0 }
 *                       netCredit:    { type: number, example: 18135.0 }
 *                       creditedAt:   { type: string, format: date-time }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/startup-bonus/live-estimate:
 *   get:
 *     summary: Get my real-time Start Up Bonus earning estimate (User only)
 *     description: |
 *       **User Access Only** — Returns a live earning estimate based on current month company BV and all units.
 *       Updates dynamically throughout the month as BV grows.
 *     tags: [User - Start Up Bonus]
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
 *                     companyBV:
 *                       type: object
 *                       properties:
 *                         totalBV:     { type: number, example: 300000 }
 *                         poolPercent: { type: number, example: 18 }
 *                         poolAmount:  { type: number, example: 54000 }
 *                     pool:
 *                       type: object
 *                       properties:
 *                         totalUnits:    { type: number, example: 36 }
 *                         perUnitValue:  { type: number, example: 1500 }
 *                         eligibleUsers: { type: number, example: 4 }
 *                     myEstimate:
 *                       type: object
 *                       properties:
 *                         myUnits:       { type: number, example: 13 }
 *                         bvPerUnit:     { type: number, example: 5000 }
 *                         noCapping:     { type: boolean, example: true }
 *                         grossEarning:  { type: number, example: 19500 }
 *                         deduction7pct: { type: number, example: 1365 }
 *                         netEarning:    { type: number, example: 18135 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/user/startup-bonus/status/{memberId}:
 *   get:
 *     summary: Get Start Up Bonus status for any member (Public)
 *     description: |
 *       **Public Access** — Retrieve the current Start Up Bonus breakdown for any member. No authentication required.
 *     tags: [User - Start Up Bonus]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *         description: Member ID (e.g. SVS000002)
 *     responses:
 *       200:
 *         description: Start Up Bonus status fetched
 *       404:
 *         description: Member not found
 */

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/startup-bonus/live-pool:
 *   get:
 *     summary: Real-time Start Up Bonus pool for current month (Admin)
 *     description: |
 *       **Admin Access Only** — Live pool preview. Company BV, 18% pool amount, all eligible users' unit counts + estimated gross/net earnings.
 *       **No DB writes.** Numbers update live as company BV grows.
 *
 *       Each user entry in `users[]` contains exactly the same columns as the Current Month Live Tracker:
 *       User | Total Left BV | Total Right BV | Self BV (Add-on) | Adjusted Weaker Leg | Projected Units | Est. Net Final (₹)
 *     tags: [Admin - Start Up Bonus]
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
 *                         month: { type: number, example: 3 }
 *                     pool:
 *                       type: object
 *                       properties:
 *                         companyTotalBV:    { type: number, example: 300000 }
 *                         poolPercent:       { type: number, example: 18 }
 *                         poolAmount:        { type: number, example: 54000 }
 *                         totalUnits:        { type: number, example: 36 }
 *                         perUnitValue:      { type: number, example: 1500 }
 *                         eligibleUserCount: { type: number, example: 4 }
 *                     users:
 *                       type: array
 *                       description: Sorted by estimatedNet descending
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId:           { type: string,  example: "SVS000001" }
 *                           fullName:           { type: string,  example: "Soumyajit Roy" }
 *                           leftBV:             { type: number,  example: 85000, description: "Total Left BV (fresh + carry-forward)" }
 *                           rightBV:            { type: number,  example: 62000, description: "Total Right BV (fresh + carry-forward)" }
 *                           personalBV:         { type: number,  example: 4000,  description: "Self BV (Add-on) added to weaker leg" }
 *                           adjustedLeft:       { type: number,  example: 85000, description: "Left BV after personal BV add-on" }
 *                           adjustedRight:      { type: number,  example: 66000, description: "Right BV after personal BV add-on" }
 *                           weakerSide:         { type: string,  example: "right", description: "Which leg received the personal BV boost" }
 *                           adjustedWeakerLeg:  { type: number,  example: 66000, description: "Adjusted Weaker Leg — value used for unit calculation" }
 *                           finalUnits:         { type: number,  example: 13,    description: "Projected Units = floor(adjustedWeakerLeg / 5000), no cap" }
 *                           estimatedGross:     { type: number,  example: 19500, description: "Gross earning = finalUnits × perUnitValue" }
 *                           estimatedNet:       { type: number,  example: 18135, description: "Est. Net Final = gross × 0.93 (after 5% admin + 2% TDS)" }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/startup-bonus/pools:
 *   get:
 *     summary: List all monthly Start Up Bonus pools (Admin)
 *     description: Paginated list of all monthly pool records, most recent first.
 *     tags: [Admin - Start Up Bonus]
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
 * /api/v1/admin/startup-bonus/pools/{year}/{month}:
 *   get:
 *     summary: Get full Start Up Bonus pool detail for a specific month (Admin)
 *     description: Returns the pool record and every user's credit breakdown.
 *     tags: [Admin - Start Up Bonus]
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
 *         description: Pool detail fetched
 *       404:
 *         description: No pool found for this month
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/startup-bonus/users:
 *   get:
 *     summary: List all active users with current-month Start Up Bonus unit estimates (Admin)
 *     description: |
 *       Returns every active user's BV breakdown and projected units for the current month.
 *       Sorted by estimated units descending.
 *
 *       Columns: User | Total Left BV | Total Right BV | Self BV (Add-on) | Adjusted Weaker Leg | Projected Units
 *     tags: [Admin - Start Up Bonus]
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
 *                     month: { type: number, example: 3 }
 *                     users:
 *                       type: array
 *                       description: Sorted by estimatedUnits descending
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId:          { type: string, example: "SVS000001" }
 *                           fullName:          { type: string, example: "Soumyajit Roy" }
 *                           leftBV:            { type: number, example: 85000, description: "Total Left BV (fresh + carry-forward)" }
 *                           rightBV:           { type: number, example: 62000, description: "Total Right BV (fresh + carry-forward)" }
 *                           personalBV:        { type: number, example: 4000,  description: "Self BV (Add-on) added to weaker leg" }
 *                           adjustedLeft:      { type: number, example: 85000 }
 *                           adjustedRight:     { type: number, example: 66000 }
 *                           weakerSide:        { type: string, example: "right" }
 *                           adjustedWeakerLeg: { type: number, example: 66000, description: "Adjusted Weaker Leg — value used for unit calculation" }
 *                           estimatedUnits:    { type: number, example: 13,    description: "floor(adjustedWeakerLeg / 5000) — no capping" }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/startup-bonus/users/{memberId}:
 *   get:
 *     summary: Get full Start Up Bonus detail for a specific user (Admin)
 *     description: Returns full payout history, carry-forward state, and current-month estimate for one user.
 *     tags: [Admin - Start Up Bonus]
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
 * /api/v1/admin/startup-bonus/trigger:
 *   post:
 *     summary: Manually trigger Start Up Bonus month-end computation (Admin)
 *     description: |
 *       Runs month-end unit computation for all users and stages wallet credit records.
 *       Does NOT credit wallets yet — use `/apply-credits` for that.
 *     tags: [Admin - Start Up Bonus]
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
 *                 message: { type: string, example: "Start Up Bonus distribution staged successfully" }
 */

/**
 * @swagger
 * /api/v1/admin/startup-bonus/apply-credits:
 *   post:
 *     summary: Apply pending Start Up Bonus wallet credits (Admin)
 *     description: |
 *       Credits all user wallets for a given month's staged distribution.
 *       Normally runs automatically on the 1st of each month at 00:05 IST.
 *     tags: [Admin - Start Up Bonus]
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
