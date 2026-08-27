/**
 * @swagger
 * tags:
 *   name: Franchise - Sales
 *   description: Franchise sales to end users (MLM members)
 */

/**
 * @swagger
 * /api/v1/franchise/sale/user/{memberId}:
 *   get:
 *     summary: Get user details by Member ID
 *     tags: [Franchise - Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: User's unique member ID (e.g., SS000001)
 *     responses:
 *       200:
 *         description: User details fetched successfully
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/v1/franchise/sale/sell:
 *   post:
 *     summary: Sell products to user
 *     description: |
 *       **Franchise Access Only** - Process a sale transaction to an MLM user.
 *       
 *       **Business Logic:**
 *       - Validates user and product availability
 *       - Deducts stock from franchise inventory
 *       - Calculates PV, BV, and GST (18%)
 *       - **Activation Rule**: First purchase with PV >= 1 activates the user account
 *       - Generates PDF invoice with tax breakdown (IGST for inter-state, CGST+SGST for intra-state)
 *       - Uploads invoice to Cloudinary and emails to user
 *       - Updates user's PV/BV accumulation
 *       
 *       **Note:** First purchase flag is set regardless of PV, but activation only occurs if PV >= 1.
 *     tags: [Franchise - Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberId, items]
 *             properties:
 *               memberId:
 *                 type: string
 *                 example: "SVS000001"
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                       minimum: 1
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, upi, bank_transfer]
 *                 default: cash
 *     responses:
 *       201:
 *         description: Sale completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     sale:
 *                       type: object
 *                       description: Complete sale record with invoice details
 *                     userActivated:
 *                       type: boolean
 *                       description: True if user was activated by this purchase
 *                     isFirstPurchase:
 *                       type: boolean
 *                       description: True if this was user's first purchase
 *                     totalPV:
 *                       type: number
 *                       description: Total Point Value for this transaction
 *                     totalBV:
 *                       type: number
 *                       description: Total Business Volume for this transaction
 *                     invoiceUrl:
 *                       type: string
 *                       description: Cloudinary URL of generated PDF invoice
 *                     emailSent:
 *                       type: boolean
 *                       description: Whether invoice email was sent successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       404:
 *         description: User or product not found
 */

/**
 * @swagger
 * /api/v1/franchise/sale/history:
 *   get:
 *     summary: Get franchise sales/order history
 *     description: |
 *       **Franchise Access Only** - Retrieve complete order history with buyer and invoice details.
 *       
 *       **Features:**
 *       - Pagination support for large datasets
 *       - Sort by any field (default: saleDate descending)
 *       
 *       **Buyer Details Included:**
 *       - Member ID, Full Name, Email, Phone
 *       - Complete Address (street, city, state, pincode)
 *       - Account Status and First Purchase Flag
 *       - Personal PV/BV and Total PV/BV
 *       
 *       **Invoice Details Included:**
 *       - Sale Number, Date, Items with Product Details
 *       - Pricing (Subtotal, GST, Grand Total)
 *       - PV/BV Values, Payment Method/Status
 *       - PDF Invoice URL (if generated)
 *       - First Purchase and Activation Flags
 *     tags: [Franchise - Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of records per page (max 100)
 *         example: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: saleDate
 *         description: Field to sort by
 *         example: "saleDate"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *         example: "desc"
 *     responses:
 *       200:
 *         description: Sales history retrieved successfully
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
 *                     sales:
 *                       type: array
 *                       description: Array of sale records with populated buyer and product details
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "65f1a2b3c4d5e6f7g8h9i0j1"
 *                           saleNo:
 *                             type: string
 *                             example: "FS-2026-00001"
 *                           saleDate:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-02-09T15:30:00.000Z"
 *                           user:
 *                             type: object
 *                             description: Complete buyer details
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               memberId:
 *                                 type: string
 *                                 example: "SVS000123"
 *                               fullName:
 *                                 type: string
 *                                 example: "John Doe"
 *                               email:
 *                                 type: string
 *                                 example: "john@example.com"
 *                               phone:
 *                                 type: string
 *                                 example: "9876543210"
 *                               address:
 *                                 type: object
 *                                 properties:
 *                                   street:
 *                                     type: string
 *                                     example: "123 Main Street"
 *                                   city:
 *                                     type: string
 *                                     example: "Mumbai"
 *                                   state:
 *                                     type: string
 *                                     example: "Maharashtra"
 *                                   zipCode:
 *                                     type: string
 *                                     example: "400001"
 *                               status:
 *                                 type: string
 *                                 example: "active"
 *                               isFirstPurchaseDone:
 *                                 type: boolean
 *                                 example: true
 *                               personalPV:
 *                                 type: number
 *                                 example: 100
 *                               totalPV:
 *                                 type: number
 *                                 example: 500
 *                               personalBV:
 *                                 type: number
 *                                 example: 200
 *                               totalBV:
 *                                 type: number
 *                                 example: 1000
 *                           items:
 *                             type: array
 *                             description: Products sold in this transaction
 *                             items:
 *                               type: object
 *                               properties:
 *                                 product:
 *                                   type: object
 *                                   properties:
 *                                     _id:
 *                                       type: string
 *                                     productName:
 *                                       type: string
 *                                       example: "Premium Health Supplement"
 *                                     productId:
 *                                       type: string
 *                                       example: "PROD001"
 *                                     hsnCode:
 *                                       type: string
 *                                       example: "3004"
 *                                     category:
 *                                       type: string
 *                                       example: "health care"
 *                                 quantity:
 *                                   type: number
 *                                   example: 2
 *                                 price:
 *                                   type: number
 *                                   example: 2500
 *                                 totalPV:
 *                                   type: number
 *                                   example: 100
 *                                 totalBV:
 *                                   type: number
 *                                   example: 0
 *                                 amount:
 *                                   type: number
 *                                   example: 5000
 *                           subTotal:
 *                             type: number
 *                             example: 5000
 *                           gstRate:
 *                             type: number
 *                             example: 18
 *                           gstAmount:
 *                             type: number
 *                             example: 900
 *                           grandTotal:
 *                             type: number
 *                             example: 5900
 *                           totalPV:
 *                             type: number
 *                             example: 100
 *                           totalBV:
 *                             type: number
 *                             example: 0
 *                           isFirstPurchase:
 *                             type: boolean
 *                             example: true
 *                           userActivated:
 *                             type: boolean
 *                             example: true
 *                           paymentMethod:
 *                             type: string
 *                             example: "cash"
 *                           paymentStatus:
 *                             type: string
 *                             example: "paid"
 *                           pdfUrl:
 *                             type: string
 *                             example: "https://res.cloudinary.com/..."
 *                     pagination:
 *                       type: object
 *                       description: Pagination metadata
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         totalCount:
 *                           type: integer
 *                           example: 95
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *                 message:
 *                   type: string
 *                   example: "Sales history fetched successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing franchise token
 *       500:
 *         description: Internal server error
 */
