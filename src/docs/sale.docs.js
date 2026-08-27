/**
 * @swagger
 * components:
 *   schemas:
 *     Invoice:
 *       type: object
 *       properties:
 *         invoiceNo: { type: string }
 *         grandTotal: { type: number }
 *         pdfUrl: { type: string }
 */

/**
 * @swagger
 * tags:
 *   name: Admin - Sales
 *   description: Sell products to Franchise
 */

/**
 * @swagger
 * /api/v1/admin/sales/sell-to-franchise:
 *   post:
 *     summary: Process sale to franchise
 *     tags: [Admin - Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               franchiseId: { type: string }
 *               items: 
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: number }
 *     responses:
 *       201:
 *         description: Sale successful, invoice generated
 */

/**
 * @swagger
 * /api/v1/admin/sales/list:
 *   get:
 *     summary: Get Sales History
 *     tags: [Admin - Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invoices
 */
