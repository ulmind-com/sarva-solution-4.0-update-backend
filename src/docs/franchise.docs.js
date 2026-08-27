/**
 * @swagger
 * components:
 *   schemas:
 *     Franchise:
 *       type: object
 *       properties:
 *         vendorId: { type: string }
 *         name: { type: string }
 *         shopName: { type: string }
 *         email: { type: string }
 *         phone: { type: string }
 *         status: { type: string, enum: [active, blocked] }
 *         city: { type: string }
 *         totalRevenue: { type: number }
 */

/**
 * @swagger
 * tags:
 *   name: Admin - Franchise
 *   description: Franchise Management (Admin Only)
 */

/**
 * @swagger
 * tags:
 *   name: Franchise - Auth
 *   description: Franchise Login
 */

/**
 * @swagger
 * /api/v1/admin/franchise/create:
 *   post:
 *     summary: Create new franchise
 *     tags: [Admin - Franchise]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, shopName, email, phone, city, password]
 *             properties:
 *               name: { type: string }
 *               shopName: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *               city: { type: string }
 *               shopAddress: 
 *                 type: object
 *                 properties:
 *                   street: { type: string }
 *                   pincode: { type: string }
 *                   state: { type: string }
 *     responses:
 *       201:
 *         description: Franchise created & welcome email sent
 */

/**
 * @swagger
 * /api/v1/admin/franchise/search:
 *   get:
 *     summary: Search franchise by vendorId or name
 *     tags: [Admin - Franchise]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *         description: Franchise vendor ID (e.g., FS000001)
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Franchise owner name (case-insensitive)
 *     responses:
 *       200:
 *         description: Franchise details fetched successfully
 *       400:
 *         description: Please provide either vendorId or name
 *       404:
 *         description: Franchise not found
 */

/**
 * @swagger
 * /api/v1/admin/franchise/list:
 *   get:
 *     summary: List franchises with filters
 *     tags: [Admin - Franchise]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List fetched
 */

/**
 * @swagger
 * /api/v1/admin/franchise/block/{franchiseId}:
 *   patch:
 *     summary: Block franchise
 *     tags: [Admin - Franchise]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Franchise blocked
 */

/**
 * @swagger
 * /api/v1/franchise/login:
 *   post:
 *     summary: Franchise Login
 *     tags: [Franchise - Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vendorId, password]
 *             properties:
 *               vendorId: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
