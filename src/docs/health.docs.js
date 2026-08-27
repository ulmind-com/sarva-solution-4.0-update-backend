/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags:
 *       - Public - Health
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: UP
 */
