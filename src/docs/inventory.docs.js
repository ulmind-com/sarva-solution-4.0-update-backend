/**
 * @swagger
 * /api/v1/franchise/inventory/list:
 *   get:
 *     summary: Get franchise inventory
 *     tags: [Franchise - Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Inventory fetched successfully
 */
