/**
 * @swagger
 * tags:
 *   - name: User - SSVPL Super Bonus (Yearly)
 *     description: (25,00,000 BV = 1 Unit | No Capping | 2% Pool | Payout April 1) Your tracked SSVPL Super Bonus status, history, and live 12-month projections.
 *   - name: Admin - SSVPL Super Bonus (Yearly)
 *     description: Administrative tools for monitoring and triggering annual SSVPL Super Bonus distributions.
 */

/**
 * @swagger
 * /api/v1/user/ssvpl-super-bonus/status:
 *   get:
 *     summary: Get your current Yearly SSVPL Super Bonus tracking status
 *     description: Returns your carry-forward BV, fresh 12-month BV, and projected units for the current active financial year.
 *     tags: [User - SSVPL Super Bonus (Yearly)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status fetched successfully
 */

/**
 * @swagger
 * /api/v1/user/ssvpl-super-bonus/history:
 *   get:
 *     summary: Get your SSVPL Super Bonus payout history
 *     description: Returns a list of all successful annual credits and unit breakdowns.
 *     tags: [User - SSVPL Super Bonus (Yearly)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History fetched successfully
 */

/**
 * @swagger
 * /api/v1/user/ssvpl-super-bonus/live-estimate:
 *   get:
 *     summary: Get live estimated SSVPL Super Bonus earning for current 12-month cycle
 *     description: |
 *       Real-time calculation based on current company 12-month fresh BV and total eligible units.
 *       Includes gross and net (after 7% deduction) estimates.
 *     tags: [User - SSVPL Super Bonus (Yearly)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Live estimate fetched successfully
 */

/**
 * @swagger
 * /api/v1/user/ssvpl-super-bonus/status/{memberId}:
 *   get:
 *     summary: Get public SSVPL Super Bonus status for any member
 *     description: Publicly check any user's SSVPL Super Bonus projections (Read-only, no auth required).
 *     tags: [User - SSVPL Super Bonus (Yearly)]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string, example: "SVS000001" }
 *     responses:
 *       200:
 *         description: Public status fetched successfully
 */

/**
 * @swagger
 * /api/v1/admin/ssvpl-super-bonus/live-pool:
 *   get:
 *     summary: Real-time Yearly SSVPL Super Bonus pool (Admin)
 *     description: |
 *       **Admin Access Only** — Live pool preview. Company 12-month BV, 2% pool amount, all eligible users' unit counts + estimated gross/net earnings.
 *       **No DB writes.** Numbers update live as company BV grows.
 *
 *       Each user entry in `users[]` contains exactly the same columns as the Active Cycle Tracker:
 *       User | Total Left BV | Total Right BV | Self BV (Add-on) | Adjusted Weaker Leg | Projected Units | Est. Net Final (₹)
 *     tags: [Admin - SSVPL Super Bonus (Yearly)]
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
 *                     currentCycle:
 *                       type: object
 *                       properties:
 *                         cycleYear:  { type: number, example: 2026 }
 *                     pool:
 *                       type: object
 *                       properties:
 *                         companyTotalBV:    { type: number, example: 200000000 }
 *                         poolPercent:       { type: number, example: 2 }
 *                         poolAmount:        { type: number, example: 4000000 }
 *                         totalUnits:        { type: number, example: 20 }
 *                         perUnitValue:      { type: number, example: 200000 }
 *                         eligibleUserCount: { type: number, example: 5 }
 *                     users:
 *                       type: array
 *                       description: Sorted by estimatedNet descending
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId:           { type: string,  example: "SVS000001" }
 *                           fullName:           { type: string,  example: "Soumyajit Roy" }
 *                           leftBV:             { type: number,  example: 8000000 }
 *                           rightBV:            { type: number,  example: 6000000 }
 *                           personalBV:         { type: number,  example: 500000 }
 *                           adjustedLeft:       { type: number,  example: 8000000 }
 *                           adjustedRight:      { type: number,  example: 6500000 }
 *                           weakerSide:         { type: string,  example: "right" }
 *                           adjustedWeakerLeg:  { type: number,  example: 6500000 }
 *                           finalUnits:         { type: number,  example: 2 }
 *                           estimatedGross:     { type: number,  example: 400000 }
 *                           estimatedNet:       { type: number,  example: 372000 }
 */

/**
 * @swagger
 * /api/v1/admin/ssvpl-super-bonus/pools:
 *   get:
 *     summary: List all distributed SSVPL Super Bonus pools (Admin)
 *     description: Paginated list of all yearly pool records, most recent first.
 *     tags: [Admin - SSVPL Super Bonus (Yearly)]
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
 */

/**
 * @swagger
 * /api/v1/admin/ssvpl-super-bonus/pools/{cycleYear}:
 *   get:
 *     summary: Get full SSVPL Super Bonus pool detail for a specific year (Admin)
 *     description: Returns the pool record and every user's credit breakdown for a given yearly cycle.
 *     tags: [Admin - SSVPL Super Bonus (Yearly)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cycleYear
 *         required: true
 *         schema: { type: integer, example: 2026 }
 *     responses:
 *       200:
 *         description: Pool detail fetched successfully
 */

/**
 * @swagger
 * /api/v1/admin/ssvpl-super-bonus/users:
 *   get:
 *     summary: List all active users with current active cycle SSVPL Super Bonus unit estimates (Admin)
 *     description: Returns every active user's BV breakdown and projected units for the current active 12-month cycle.
 *     tags: [Admin - SSVPL Super Bonus (Yearly)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview fetched successfully
 */

/**
 * @swagger
 * /api/v1/admin/ssvpl-super-bonus/users/{memberId}:
 *   get:
 *     summary: Get full SSVPL Super Bonus detail for a specific user (Admin)
 *     description: Returns full payout history, current carry-forward state, and active cycle estimate for one user.
 *     tags: [Admin - SSVPL Super Bonus (Yearly)]
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
 */

/**
 * @swagger
 * /api/v1/admin/ssvpl-super-bonus/trigger:
 *   post:
 *     summary: Manually trigger SSVPL Super Bonus cycle-end computation (Admin)
 *     description: |
 *       Runs yearly unit computation for all users and stages wallet credit records for the completed cycle.
 *       Does NOT credit wallets yet — use `/apply-credits` for that.
 *     tags: [Admin - SSVPL Super Bonus (Yearly)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cycleYear]
 *             properties:
 *               cycleYear:  { type: integer, example: 2026 }
 *     responses:
 *       200:
 *         description: Distribution staged successfully
 */

/**
 * @swagger
 * /api/v1/admin/ssvpl-super-bonus/apply-credits:
 *   post:
 *     summary: Apply pending SSVPL Super Bonus wallet credits (Admin)
 *     description: |
 *       Credits all user wallets for a given yearly cycle's staged distribution.
 *       Normally runs automatically on April 1st at 00:40 IST.
 *     tags: [Admin - SSVPL Super Bonus (Yearly)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cycleYear]
 *             properties:
 *               cycleYear:  { type: integer, example: 2026 }
 *     responses:
 *       200:
 *         description: Wallet credits applied successfully
 */
