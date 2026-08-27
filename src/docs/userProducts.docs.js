/**
 * @swagger
 * /api/v1/user/products:
 *   get:
 *     summary: Get all products (paginated)
 *     description: |-
 *       **Authenticated User** - Get all active products with pagination only. No filters.
 *       
 *       Returns all approved products sorted by newest first.
 *     tags:
 *       - User - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Products fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           productName:
 *                             type: string
 *                           description:
 *                             type: string
 *                           price:
 *                             type: number
 *                           mrp:
 *                             type: number
 *                           finalPrice:
 *                             type: number
 *                           discount:
 *                             type: number
 *                           bv:
 *                             type: number
 *                           pv:
 *                             type: number
 *                           productDP:
 *                             type: number
 *                           category:
 *                             type: string
 *                           productImage:
 *                             type: object
 *                           stockQuantity:
 *                             type: number
 *                           isInStock:
 *                             type: boolean
 *                           isFeatured:
 *                             type: boolean
 *                           hsnCode:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         totalProducts:
 *                           type: integer
 *                           example: 50
 *                         limit:
 *                           type: integer
 *                           example: 12
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *                 message:
 *                   type: string
 *                   example: "Products fetched successfully"
 *       401:
 *         description: Unauthorized - Authentication required
 */
