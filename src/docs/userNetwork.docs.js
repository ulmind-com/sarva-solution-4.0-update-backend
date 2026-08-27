/**
 * @swagger
 * tags:
 *   - name: User - Network
 *     description: Analytics and Tree tools for managing the user's MLM Binary Network
 */

/**
 * @swagger
 * /api/v1/user/network/star-count/{memberId}:
 *   get:
 *     summary: Get Star users count for Left and Right legs
 *     description: Fetches the total number of qualified Star users strictly inside the target user's downline tree on the left and right legs.
 *     tags: [User - Network]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           example: "SVS000001"
 *         description: The Member ID of the user whose star counts you want to check
 *     responses:
 *       200:
 *         description: Star counts fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Star counts fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     leftStarCount:
 *                       type: integer
 *                       example: 5
 *                       description: Number of Star-qualified users in the left downline
 *                     rightStarCount:
 *                       type: integer
 *                       example: 2
 *                       description: Number of Star-qualified users in the right downline
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server Error
 */
