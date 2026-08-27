/**
 * @swagger
 * tags:
 *   - name: Admin - Site Settings
 *     description: Administrative tools for configuring site-wide global settings such as the main banner/popup.
 *   - name: Public - Site Settings
 *     description: Open endpoints to fetch live site configuration to be displayed on the frontend.
 */

/**
 * @swagger
 * /api/v1/admin/banner/upload:
 *   post:
 *     summary: Upload a single site-wide banner/popup image
 *     description: Uploads an original unmodified image to Cloudinary. Automatically deletes any previously active banner to save space.
 *     tags: [Admin - Site Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The banner image file
 *     responses:
 *       200:
 *         description: Banner uploaded successfully
 *       400:
 *         description: No image provided
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/banner:
 *   get:
 *     summary: Get the active banner/popup image
 *     description: Fetches the current active site-wide banner image URL. Read-only, openly accessible.
 *     tags: [Public - Site Settings]
 *     responses:
 *       200:
 *         description: Banner fetched successfully
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
 *                   example: Banner fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     bannerUrl:
 *                       type: string
 *                       example: https://res.cloudinary.com/...
 */
