/**
 * @swagger
 * tags:
 *   name: Public - Products
 *   description: Public product browsing endpoints
 */

/**
 * @swagger
 * /api/v1/user/products/{productId}:
 *   get:
 *     summary: Get complete product details (Public)
 *     description: |-
 *       **Public Access** - Get complete product information including pricing, stock availability, MLM values (PV/BV/DP), tax details, and related products.
 *       
 *       **Returns:**
 *       - Complete product details (all fields)
 *       - Stock availability and status
 *       - Pricing (price, MRP, final price, discount)
 *       - MLM values (PV, BV, Dealer Price)
 *       - Tax details (GST, CGST, SGST, HSN Code)
 *       - Product images and description
 *       - Related products from same category
 *     tags:
 *       - Public - Products
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *         example: "6982428e467e29cbbffd11bf"
 *     responses:
 *       200:
 *         description: Product details fetched successfully
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
 *                     product:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         productName:
 *                           type: string
 *                           example: "Uria Growth Supplement"
 *                         description:
 *                           type: string
 *                         price:
 *                           type: number
 *                           description: Base selling price (excluding taxes)
 *                           example: 49
 *                         mrp:
 *                           type: number
 *                           description: Maximum Retail Price
 *                           example: 60
 *                         finalPrice:
 *                           type: number
 *                           description: Price after tax and discount
 *                           example: 57.82
 *                         discount:
 *                           type: number
 *                           example: 0
 *                         discountPercentage:
 *                           type: number
 *                           description: Calculated discount percentage
 *                           example: 5
 *                         gst:
 *                           type: number
 *                           description: GST percentage
 *                           example: 18
 *                         cgst:
 *                           type: number
 *                           description: CGST percentage
 *                           example: 9
 *                         sgst:
 *                           type: number
 *                           description: SGST percentage
 *                           example: 9
 *                         bv:
 *                           type: number
 *                           description: Business Volume (MLM)
 *                           example: 10
 *                         pv:
 *                           type: number
 *                           description: Point Value (MLM)
 *                           example: 0.5
 *                         productDP:
 *                           type: number
 *                           description: Dealer Price / Distribution Price
 *                           example: 45
 *                         hsnCode:
 *                           type: string
 *                           description: HSN/SAC Code for taxation
 *                           example: "3004"
 *                         category:
 *                           type: string
 *                           enum: [aquaculture, agriculture, personal care, health care, home care, luxury goods]
 *                           example: "aquaculture"
 *                         productImage:
 *                           type: object
 *                           properties:
 *                             url:
 *                               type: string
 *                             publicId:
 *                               type: string
 *                         stockQuantity:
 *                           type: number
 *                           description: Available stock quantity
 *                           example: 70
 *                         isInStock:
 *                           type: boolean
 *                           description: Computed field
 *                           example: true
 *                         stockStatus:
 *                           type: string
 *                           description: Computed status
 *                           example: "In Stock"
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         isApproved:
 *                           type: boolean
 *                           example: true
 *                         isFeatured:
 *                           type: boolean
 *                           example: false
 *                         batchNo:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                     relatedProducts:
 *                       type: array
 *                       description: Up to 6 related products from same category (in-stock only)
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           productName:
 *                             type: string
 *                           finalPrice:
 *                             type: number
 *                           mrp:
 *                             type: number
 *                           productImage:
 *                             type: object
 *                           stockQuantity:
 *                             type: number
 *                           bv:
 *                             type: number
 *                           pv:
 *                             type: number
 *                 message:
 *                   type: string
 *                   example: "Product details fetched successfully"
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Product not found"
 */
