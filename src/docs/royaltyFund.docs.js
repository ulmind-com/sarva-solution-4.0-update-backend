/**
 * @swagger
 * tags:
 *   - name: User - Royalty Fund (Yearly)
 *     description: (7,50,000 BV = 1 Unit | No Capping | 3% Pool | Payout April 1) Your tracked Royalty Fund status, history, and live 12-month projections.
 *   - name: Admin - Royalty Fund (Yearly)
 *     description: Administrative tools for monitoring and triggering annual Royalty Fund distributions.
 */

/**
 * @swagger
 * /api/v1/user/royalty-fund/status:
 *   get:
 *     summary: Get your current Yearly Royalty Fund tracking status
 *     description: Returns your carry-forward BV, fresh 12-month BV, and projected units for the current active financial year.
 *     tags: [User - Royalty Fund (Yearly)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status fetched successfully
 */

/**
 * @swagger
 * /api/v1/user/royalty-fund/history:
 *   get:
 *     summary: Get your Royalty Fund payout history
 *     description: Returns a list of all successful annual credits and unit breakdowns.
 *     tags: [User - Royalty Fund (Yearly)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History fetched successfully
 */

/**
 * @swagger
 * /api/v1/user/royalty-fund/live-estimate:
 *   get:
 *     summary: Get live estimated Royalty Fund earning for current 12-month cycle
 *     description: |
 *       Real-time calculation based on current company 12-month fresh BV and total eligible units.
 *       Includes gross and net (after 7% deduction) estimates.
 *     tags: [User - Royalty Fund (Yearly)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Live estimate fetched successfully
 */

/**
 * @swagger
 * /api/v1/user/royalty-fund/status/{memberId}:
 *   get:
 *     summary: Get public Royalty Fund status for any member
 *     description: Publicly check any user's Royalty Fund projections (Read-only, no auth required).
 *     tags: [User - Royalty Fund (Yearly)]
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
 * /api/v1/admin/royalty-fund/live-pool:
 *   get:
 *     summary: Real-time Yearly Royalty Fund pool (Admin)
 *     description: |
 *       **Admin Access Only** — Live pool preview. Company 12-month BV, 3% pool amount, all eligible users' unit counts + estimated gross/net earnings.
 *       **No DB writes.** Numbers update live as company BV grows.
 *
 *       Each user entry in `users[]` contains exactly the same columns as the Active Cycle Tracker:
 *       User | Total Left BV | Total Right BV | Self BV (Add-on) | Adjusted Weaker Leg | Projected Units | Est. Net Final (₹)
 *     tags: [Admin - Royalty Fund (Yearly)]
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
 *                         companyTotalBV:    { type: number, example: 100000000 }
 *                         poolPercent:       { type: number, example: 3 }
 *                         poolAmount:        { type: number, example: 3000000 }
 *                         totalUnits:        { type: number, example: 50 }
 *                         perUnitValue:      { type: number, example: 60000 }
 *                         eligibleUserCount: { type: number, example: 10 }
 *                     users:
 *                       type: array
 *                       description: Sorted by estimatedNet descending
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId:           { type: string,  example: "SVS000001" }
 *                           fullName:           { type: string,  example: "Soumyajit Roy" }
 *                           leftBV:             { type: number,  example: 9000000 }
 *                           rightBV:            { type: number,  example: 8000000 }
 *                           personalBV:         { type: number,  example: 200000 }
 *                           adjustedLeft:       { type: number,  example: 9000000 }
 *                           adjustedRight:      { type: number,  example: 8200000 }
 *                           weakerSide:         { type: string,  example: "right" }
 *                           adjustedWeakerLeg:  { type: number,  example: 8200000 }
 *                           finalUnits:         { type: number,  example: 10 }
 *                           estimatedGross:     { type: number,  example: 600000 }
 *                           estimatedNet:       { type: number,  example: 558000 }
 */

/**
 * @swagger
 * /api/v1/admin/royalty-fund/pools:
 *   get:
 *     summary: List all distributed Royalty Fund pools (Admin)
 *     description: Paginated list of all yearly pool records, most recent first.
 *     tags: [Admin - Royalty Fund (Yearly)]
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
 * /api/v1/admin/royalty-fund/pools/{cycleYear}:
 *   get:
 *     summary: Get full Royalty Fund pool detail for a specific year (Admin)
 *     description: Returns the pool record and every user's credit breakdown for a given yearly cycle.
 *     tags: [Admin - Royalty Fund (Yearly)]
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
 * /api/v1/admin/royalty-fund/users:
 *   get:
 *     summary: List all active users with current active cycle Royalty Fund unit estimates (Admin)
 *     description: Returns every active user's BV breakdown and projected units for the current active 12-month cycle.
 *     tags: [Admin - Royalty Fund (Yearly)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview fetched successfully
 */

/**
 * @swagger
 * /api/v1/admin/royalty-fund/users/{memberId}:
 *   get:
 *     summary: Get full Royalty Fund detail for a specific user (Admin)
 *     description: Returns full payout history, current carry-forward state, and active cycle estimate for one user.
 *     tags: [Admin - Royalty Fund (Yearly)]
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
 * /api/v1/admin/royalty-fund/trigger:
 *   post:
 *     summary: Manually trigger Royalty Fund cycle-end computation (Admin)
 *     description: |
 *       Runs yearly unit computation for all users and stages wallet credit records for the completed cycle.
 *       Does NOT credit wallets yet — use `/apply-credits` for that.
 *     tags: [Admin - Royalty Fund (Yearly)]
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
 * /api/v1/admin/royalty-fund/apply-credits:
 *   post:
 *     summary: Apply pending Royalty Fund wallet credits (Admin)
 *     description: |
 *       Credits all user wallets for a given yearly cycle's staged distribution.
 *       Normally runs automatically on April 1st at 00:35 IST.
 *     tags: [Admin - Royalty Fund (Yearly)]
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
