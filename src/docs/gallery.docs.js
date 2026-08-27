/**
 * @swagger
 * tags:
 *   - name: Admin - Gallery
 *     description: Administrative tools for configuring site-wide gallery images.
 *   - name: Public - Gallery
 *     description: Open endpoints to fetch live gallery configuration to be displayed on the frontend.
 */

/**
 * @swagger
 * /api/v1/admin/gallery/upload:
 *   post:
 *     summary: Upload or replace a gallery image
 *     description: Uploads an original unmodified image to Cloudinary at a specific position (1-12). Replaces any existing image at that position.
 *     tags: [Admin - Gallery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - position
 *               - title
 *               - image
 *             properties:
 *               position:
 *                 type: integer
 *                 description: The gallery position (1 to 12)
 *                 example: 3
 *               title:
 *                 type: string
 *                 description: Image title to show in gallery
 *                 example: "Company Annual Meet 2026"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The gallery image file
 *     responses:
 *       200:
 *         description: Gallery image uploaded successfully
 *       400:
 *         description: Invalid input or missing file
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/gallery:
 *   get:
 *     summary: Get all active gallery images
 *     description: Fetches all currently active gallery images sorted by position. Read-only, openly accessible.
 *     tags: [Public - Gallery]
 *     responses:
 *       200:
 *         description: Gallery fetched successfully
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
 *                   example: Gallery fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       position:
 *                         type: integer
 *                         example: 3
 *                       title:
 *                         type: string
 *                         example: "Company Annual Meet 2026"
 *                       imageUrl:
 *                         type: string
 *                         example: https://res.cloudinary.com/...
 */
