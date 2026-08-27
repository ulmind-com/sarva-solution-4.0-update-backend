/**
 * @swagger
 * tags:
 *   name: Franchise - Requests
 *   description: Request products from Admin
 */

/**
 * @swagger
 * tags:
 *   name: Admin - Requests
 *   description: Approvals
 */

/**
 * @swagger
 * /api/v1/franchise/requests/inventory:
 *   get:
 *     summary: Browse Admin Inventory
 *     tags: [Franchise - Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *       - in: query
 *         name: search
 *     responses:
 *       200:
 *         description: Inventory list
 */

/**
 * @swagger
 * /api/v1/franchise/requests/create:
 *   post:
 *     summary: Create Request
 *     tags: [Franchise - Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items: 
 *                 type: array
 *                 items: { type: object, properties: { productId: {type: string}, requestedQuantity: {type: number} } }
 *     responses:
 *       201:
 *         description: Request created
 */

/**
 * @swagger
 * /api/v1/admin/requests/list:
 *   get:
 *     summary: List Requests
 *     tags: [Admin - Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List
 */

/**
 * @swagger
 * /api/v1/admin/requests/{requestId}/approve:
 *   patch:
 *     summary: Approve Request (Triggers Sale/Invoice)
 *     tags: [Admin - Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Approved and Processed
 */
