/**
 * @swagger
 * tags:
 *   - name: User - House Fund (Half-Yearly)
 *     description: (2,50,000 BV = 1 Unit | No Capping | 3% Pool | Payout Apr 1 & Oct 1) Your tracked House Fund status, history, and live half-yearly projections.
 *   - name: Admin - House Fund (Half-Yearly)
 *     description: Administrative tools for monitoring and triggering half-yearly House Fund distributions.
 */

/**
 * @swagger
 * /api/v1/user/house-fund/status:
 *   get:
 *     summary: Get your current Half-Yearly House Fund tracking status
 *     description: Returns your carry-forward BV, fresh 6-month BV, and projected units for the current active cycle.
 *     tags: [User - House Fund (Half-Yearly)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status fetched successfully
 */

/**
 * @swagger
 * /api/v1/user/house-fund/history:
 *   get:
 *     summary: Get your House Fund payout history
 *     description: Returns a list of all successful half-yearly credits and unit breakdowns.
 *     tags: [User - House Fund (Half-Yearly)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History fetched successfully
 */

/**
 * @swagger
 * /api/v1/user/house-fund/live-estimate:
 *   get:
 *     summary: Get live estimated House Fund earning for current 6-month cycle
 *     description: |
 *       Real-time calculation based on current company 6-month fresh BV and total eligible units.
 *       Includes gross and net (after 7% deduction) estimates.
 *     tags: [User - House Fund (Half-Yearly)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Live estimate fetched successfully
 */

/**
 * @swagger
 * /api/v1/user/house-fund/status/{memberId}:
 *   get:
 *     summary: Get public House Fund status for any member
 *     description: Publicly check any user's House Fund projections (Read-only, no auth required).
 *     tags: [User - House Fund (Half-Yearly)]
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
 * /api/v1/admin/house-fund/live-pool:
 *   get:
 *     summary: Real-time Half-Yearly House Fund pool (Admin)
 *     description: |
 *       **Admin Access Only** — Live pool preview. Company 6-month BV, 3% pool amount, all eligible users' unit counts + estimated gross/net earnings.
 *       **No DB writes.** Numbers update live as company BV grows.
 *
 *       Each user entry in `users[]` contains exactly the same columns as the Active Cycle Tracker:
 *       User | Total Left BV | Total Right BV | Self BV (Add-on) | Adjusted Weaker Leg | Projected Units | Est. Net Final (₹)
 *     tags: [Admin - House Fund (Half-Yearly)]
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
 *                         cycleNumber: { type: number, example: 1 }
 *                     pool:
 *                       type: object
 *                       properties:
 *                         companyTotalBV:    { type: number, example: 50000000 }
 *                         poolPercent:       { type: number, example: 3 }
 *                         poolAmount:        { type: number, example: 1500000 }
 *                         totalUnits:        { type: number, example: 60 }
 *                         perUnitValue:      { type: number, example: 25000 }
 *                         eligibleUserCount: { type: number, example: 10 }
 *                     users:
 *                       type: array
 *                       description: Sorted by estimatedNet descending
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId:           { type: string,  example: "SVS000001" }
 *                           fullName:           { type: string,  example: "Soumyajit Roy" }
 *                           leftBV:             { type: number,  example: 3000000 }
 *                           rightBV:            { type: number,  example: 2600000 }
 *                           personalBV:         { type: number,  example: 100000 }
 *                           adjustedLeft:       { type: number,  example: 3000000 }
 *                           adjustedRight:      { type: number,  example: 2700000 }
 *                           weakerSide:         { type: string,  example: "right" }
 *                           adjustedWeakerLeg:  { type: number,  example: 2700000 }
 *                           finalUnits:         { type: number,  example: 10 }
 *                           estimatedGross:     { type: number,  example: 250000 }
 *                           estimatedNet:       { type: number,  example: 232500 }
 */

/**
 * @swagger
 * /api/v1/admin/house-fund/pools:
 *   get:
 *     summary: List all distributed House Fund pools (Admin)
 *     description: Paginated list of all half-yearly pool records, most recent first.
 *     tags: [Admin - House Fund (Half-Yearly)]
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
 * /api/v1/admin/house-fund/pools/{cycleYear}/{cycleNumber}:
 *   get:
 *     summary: Get full House Fund pool detail for a specific cycle (Admin)
 *     description: Returns the pool record and every user's credit breakdown for a given half-yearly cycle.
 *     tags: [Admin - House Fund (Half-Yearly)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cycleYear
 *         required: true
 *         schema: { type: integer, example: 2026 }
 *       - in: path
 *         name: cycleNumber
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     responses:
 *       200:
 *         description: Pool detail fetched successfully
 */

/**
 * @swagger
 * /api/v1/admin/house-fund/users:
 *   get:
 *     summary: List all active users with current active cycle House Fund unit estimates (Admin)
 *     description: Returns every active user's BV breakdown and projected units for the current active 6-month cycle.
 *     tags: [Admin - House Fund (Half-Yearly)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview fetched successfully
 */

/**
 * @swagger
 * /api/v1/admin/house-fund/users/{memberId}:
 *   get:
 *     summary: Get full House Fund detail for a specific user (Admin)
 *     description: Returns full payout history, current carry-forward state, and active cycle estimate for one user.
 *     tags: [Admin - House Fund (Half-Yearly)]
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
 * /api/v1/admin/house-fund/trigger:
 *   post:
 *     summary: Manually trigger House Fund cycle-end computation (Admin)
 *     description: |
 *       Runs half-yearly unit computation for all users and stages wallet credit records for the completed cycle.
 *       Does NOT credit wallets yet — use `/apply-credits` for that.
 *     tags: [Admin - House Fund (Half-Yearly)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cycleYear, cycleNumber]
 *             properties:
 *               cycleYear:  { type: integer, example: 2026 }
 *               cycleNumber: { type: integer, example: 1 }
 *     responses:
 *       200:
 *         description: Distribution staged successfully
 */

/**
 * @swagger
 * /api/v1/admin/house-fund/apply-credits:
 *   post:
 *     summary: Apply pending House Fund wallet credits (Admin)
 *     description: |
 *       Credits all user wallets for a given half-yearly cycle's staged distribution.
 *       Normally runs automatically on April 1st and October 1st at 00:30 IST.
 *     tags: [Admin - House Fund (Half-Yearly)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cycleYear, cycleNumber]
 *             properties:
 *               cycleYear:  { type: integer, example: 2026 }
 *               cycleNumber: { type: integer, example: 1 }
 *     responses:
 *       200:
 *         description: Wallet credits applied successfully
 */
