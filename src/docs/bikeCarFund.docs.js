/**
 * @swagger
 * tags:
 *   - name: User - Bike & Car Fund
 *     description: (1,00,000 BV = 1 Unit | No Capping | 5% Pool) Your tracked Bike & Car Fund status, history, and live projections.
 *   - name: Admin - Bike & Car Fund
 *     description: Administrative tools for monitoring and triggering monthly Bike & Car Fund distributions.
 */

/**
 * @swagger
 * /api/v1/user/bike-car-fund/status:
 *   get:
 *     summary: Get your current Bike & Car Fund tracking status
 *     description: Returns your carry-forward BV, fresh monthly BV, and projected units for the current month.
 *     tags: [User - Bike & Car Fund]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status fetched successfully
 */

/**
 * @swagger
 * /api/v1/user/bike-car-fund/history:
 *   get:
 *     summary: Get your Bike & Car Fund payout history
 *     description: Returns a list of all successful monthly credits and unit breakdowns.
 *     tags: [User - Bike & Car Fund]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History fetched successfully
 */

/**
 * @swagger
 * /api/v1/user/bike-car-fund/live-estimate:
 *   get:
 *     summary: Get live estimated Bike & Car Fund earning for current month
 *     description: |
 *       Real-time calculation based on current company fresh BV and total eligible units.
 *       Includes gross and net (after 7% deduction) estimates.
 *     tags: [User - Bike & Car Fund]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Live estimate fetched successfully
 */

/**
 * @swagger
 * /api/v1/user/bike-car-fund/status/{memberId}:
 *   get:
 *     summary: Get public Bike & Car Fund status for any member
 *     description: Publicly check any user's Bike & Car Fund projections (Read-only, no auth required).
 *     tags: [User - Bike & Car Fund]
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
 * /api/v1/admin/bike-car-fund/live-pool:
 *   get:
 *     summary: Real-time Bike & Car Fund pool for current month (Admin)
 *     description: |
 *       **Admin Access Only** — Live pool preview. Company BV, 5% pool amount, all eligible users' unit counts + estimated gross/net earnings.
 *       **No DB writes.** Numbers update live as company BV grows.
 *
 *       Each user entry in `users[]` contains exactly the same columns as the Current Month Live Tracker:
 *       User | Total Left BV | Total Right BV | Self BV (Add-on) | Adjusted Weaker Leg | Projected Units | Est. Net Final (₹)
 *     tags: [Admin - Bike & Car Fund]
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
 *                         companyTotalBV:    { type: number, example: 20000000 }
 *                         poolPercent:       { type: number, example: 5 }
 *                         poolAmount:        { type: number, example: 1000000 }
 *                         totalUnits:        { type: number, example: 50 }
 *                         perUnitValue:      { type: number, example: 20000 }
 *                         eligibleUserCount: { type: number, example: 5 }
 *                     users:
 *                       type: array
 *                       description: Sorted by estimatedNet descending
 *                       items:
 *                         type: object
 *                         properties:
 *                           memberId:           { type: string,  example: "SVS000001" }
 *                           fullName:           { type: string,  example: "Soumyajit Roy" }
 *                           leftBV:             { type: number,  example: 1210000 }
 *                           rightBV:            { type: number,  example: 1010000 }
 *                           personalBV:         { type: number,  example: 60000 }
 *                           adjustedLeft:       { type: number,  example: 1210000 }
 *                           adjustedRight:      { type: number,  example: 1010000 }
 *                           weakerSide:         { type: string,  example: "right" }
 *                           adjustedWeakerLeg:  { type: number,  example: 1010000 }
 *                           finalUnits:         { type: number,  example: 10 }
 *                           estimatedGross:     { type: number,  example: 200000 }
 *                           estimatedNet:       { type: number,  example: 186000 }
 */

/**
 * @swagger
 * /api/v1/admin/bike-car-fund/pools:
 *   get:
 *     summary: List all monthly Bike & Car Fund pools (Admin)
 *     description: Paginated list of all monthly pool records, most recent first.
 *     tags: [Admin - Bike & Car Fund]
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
 * /api/v1/admin/bike-car-fund/pools/{year}/{month}:
 *   get:
 *     summary: Get full Bike & Car Fund pool detail for a specific month (Admin)
 *     description: Returns the pool record and every user's credit breakdown for a given month.
 *     tags: [Admin - Bike & Car Fund]
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
 */

/**
 * @swagger
 * /api/v1/admin/bike-car-fund/users:
 *   get:
 *     summary: List all active users with current-month Bike & Car Fund unit estimates (Admin)
 *     description: Returns every active user's BV breakdown and projected units for the current month.
 *     tags: [Admin - Bike & Car Fund]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview fetched successfully
 */

/**
 * @swagger
 * /api/v1/admin/bike-car-fund/users/{memberId}:
 *   get:
 *     summary: Get full Bike & Car Fund detail for a specific user (Admin)
 *     description: Returns full payout history, current carry-forward state, and current-month estimate for one user.
 *     tags: [Admin - Bike & Car Fund]
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
 * /api/v1/admin/bike-car-fund/trigger:
 *   post:
 *     summary: Manually trigger Bike & Car Fund month-end computation (Admin)
 *     description: |
 *       Runs month-end unit computation for all users and stages wallet credit records.
 *       Does NOT credit wallets yet — use `/apply-credits` for that.
 *     tags: [Admin - Bike & Car Fund]
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
 */

/**
 * @swagger
 * /api/v1/admin/bike-car-fund/apply-credits:
 *   post:
 *     summary: Apply pending Bike & Car Fund wallet credits (Admin)
 *     description: |
 *       Credits all user wallets for a given month's staged distribution.
 *       Normally runs automatically on the 1st of each month at 00:25 IST.
 *     tags: [Admin - Bike & Car Fund]
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
 */
