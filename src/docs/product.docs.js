/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *           description: MongoDB ObjectId
 *         productId:
 *           type: string
 *           example: "PRD-2026-00001"
 *           description: Auto-generated human-readable product ID
 *         productName:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         mrp:
 *           type: number
 *         finalPrice:
 *           type: number
 *         discount:
 *           type: number
 *         bv:
 *           type: number
 *         pv:
 *           type: number
 *         hsnCode:
 *           type: string
 *         batchNo:
 *           type: string
 *         sku:
 *           type: string
 *         category:
 *           type: string
 *           enum: ['aquaculture', 'agriculture', 'personal care', 'health care', 'home care', 'luxury goods']
 *         productImage:
 *           type: object
 *           properties:
 *             url: { type: string }
 *             publicId: { type: string }
 *         stockQuantity:
 *           type: number
 *         reorderLevel:
 *           type: number
 *         isInStock:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         isApproved:
 *           type: boolean
 *         isFeatured:
 *           type: boolean
 *         isActivationPackage:
 *           type: boolean
 */

/**
 * @swagger
 * tags:
 *   name: Admin - Products
 *   description: Product Inventory Management (Admin Only)
 */

/**
 * @swagger
 * tags:
 *   name: User - Products
 *   description: Product Browsing & Shopping (User Access)
 */

/**
 * @swagger
 * /api/v1/admin/product/create:
 *   post:
 *     summary: Create a new product
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [productName, description, price, mrp, category, stockQuantity, productDP, productImage]
 *             properties:
 *               productName:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               mrp:
 *                 type: number
 *               category:
 *                 type: string
 *                 enum: ['aquaculture', 'agriculture', 'personal care', 'health care', 'home care', 'luxury goods']
 *               stockQuantity:
 *                 type: number
 *               productDP:
 *                 type: number
 *                 description: Dealer Price / Distribution Price
 *               bv:
 *                 type: number
 *                 description: Business Volume
 *               pv:
 *                 type: number
 *                 description: Point Value
 *               cgst:
 *                 type: number
 *               sgst:
 *                 type: number
 *               hsnCode:
 *                 type: string
 *               productImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Product' }
 *                 message: { type: string }
 */

/**
 * @swagger
 * /api/v1/admin/product/update/{productId}:
 *   put:
 *     summary: Update an existing product
 *     description: Update product details including name, price, images, stock, and other attributes. All fields are optional - only send fields you want to update.
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the product to update
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *                 description: Name of the product
 *                 example: "Premium Health Supplement"
 *               description:
 *                 type: string
 *                 description: Detailed product description
 *                 example: "High-quality health supplement with essential vitamins"
 *               price:
 *                 type: number
 *                 description: Base selling price (excluding taxes)
 *                 example: 2500
 *               mrp:
 *                 type: number
 *                 description: Maximum Retail Price (inclusive of taxes)
 *                 example: 3000
 *               category:
 *                 type: string
 *                 enum: ['aquaculture', 'agriculture', 'personal care', 'health care', 'home care', 'luxury goods']
 *                 description: Product category
 *                 example: "health care"
 *               stockQuantity:
 *                 type: number
 *                 description: Available stock quantity
 *                 example: 100
 *               productDP:
 *                 type: number
 *                 description: Dealer Price / Distribution Price
 *                 example: 2200
 *               bv:
 *                 type: number
 *                 description: Business Volume points
 *                 example: 80
 *               pv:
 *                 type: number
 *                 description: Point Value for MLM calculations
 *                 example: 100
 *               cgst:
 *                 type: number
 *                 description: Central GST percentage
 *                 example: 9
 *               sgst:
 *                 type: number
 *                 description: State GST percentage
 *                 example: 9
 *               hsnCode:
 *                 type: string
 *                 description: HSN code for tax purposes
 *                 example: "3004"
 *               discount:
 *                 type: number
 *                 description: Discount percentage
 *                 example: 10
 *               isFeatured:
 *                 type: boolean
 *                 description: Mark product as featured
 *                 example: true
 *               isActivationPackage:
 *                 type: boolean
 *                 description: Mark as activation package for new users
 *                 example: false
 *               isActive:
 *                 type: boolean
 *                 description: Product active status
 *                 example: true
 *               productImage:
 *                 type: string
 *                 format: binary
 *                 description: Product image file (optional - only if updating image)
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *                 message:
 *                   type: string
 *                   example: "Product updated successfully"
 *       400:
 *         description: Bad request - validation error
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
 *                   example: "MRP cannot be less than the Selling Price"
 *       404:
 *         description: Product not found or has been deleted
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
 *                   example: "Product not found or has been deleted"
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/v1/admin/product/{productId}:
 *   delete:
 *     summary: Delete a product (soft delete)
 *     description: Soft delete a product by setting deletedAt timestamp and marking as inactive. The product data is preserved in the database but won't appear in active listings.
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the product to delete
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Product deleted successfully
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
 *                     productId:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     productName:
 *                       type: string
 *                       example: "Premium Health Supplement"
 *                     deletedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-02-09T14:27:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "Product deleted successfully"
 *       400:
 *         description: Product has already been deleted
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
 *                   example: "Product has already been deleted"
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
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/v1/admin/product/list:
 *   get:
 *     summary: Get all products with pagination & filters
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of products
 */

/**
 * @swagger
 * /api/v1/admin/product/stock/add/{productId}:
 *   patch:
 *     summary: Add stock to inventory
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantityToAdd]
 *             properties:
 *               quantityToAdd: { type: number, min: 1 }
 *     responses:
 *       200:
 *         description: Stock added successfully
 */

/**
 * @swagger
 * /api/v1/admin/product/stock/remove/{productId}:
 *   patch:
 *     summary: Remove stock from inventory
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantityToRemove]
 *             properties:
 *               quantityToRemove: { type: number, min: 1 }
 *     responses:
 *       200:
 *         description: Stock removed successfully
 */


/**
 * @swagger
 * /api/v1/admin/product/stock/history/{productId}:
 *   get:
 *     summary: Get stock transaction history
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *     responses:
 *       200:
 *         description: Stock history fetched
 */

/**
 * @swagger
 * /api/v1/user/products:
 *   get:
 *     summary: Browse products with filtering
 *     tags: [User - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Product list fetched
 */

/**
 * @swagger
 * /api/v1/user/products/{productId}:
 *   get:
 *     summary: Get product details
 *     tags: [User - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *     responses:
 *       200:
 *         description: Product details fetched
 *       404:
 *         description: Product not found
 */
