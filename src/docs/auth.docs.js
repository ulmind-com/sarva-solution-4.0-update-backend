/**
 * @swagger
 * /api/v1/register/user:
 *   post:
 *     summary: Register a new user in the SSVPL System (Public)
 *     description: |
 *       **Public Access** - Register a new user in the MLM system.
 *       
 *       **Mandatory Step**: All users must register through this endpoint before they can access the system.
 *       Upon registration, the user is placed in the binary tree (Genealogy) and assigned an initial 500 BV package.
 *     tags:
 *       - Public - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *               - phone
 *               - sponsorId
 *               - panCardNumber
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               sponsorId:
 *                 type: string
 *               panCardNumber:
 *                 type: string
 *               preferredPosition:
 *                 type: string
 *                 enum: [left, right]
 *                 description: "Optional. 'left' places user at extreme left of sponsor's left leg. 'right' places at extreme right of sponsor's right leg. Defaults to auto-balance (extreme left spillover)."
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     memberId:
 *                       type: string
 *                     token:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 * 
 * /api/v1/user-name/{memberId}:
 *   get:
 *     summary: Get User Name by Member ID (Public)
 *     description: |
 *       **Public Access** - Retrieve the full name of a user for validation during registration.
 *     tags: [Public - Auth]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *         example: "SVS12345678"
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     fullName: { type: string }
 *                     memberId: { type: string }
 *       404:
 *         description: User not found
 * 
 * /api/v1/login/user:
 *   post:
 *     summary: User Login (Public)
 *     description: |
 *       **Public Access** - Authenticate using your Member ID and password.
 *       
 *       **Mandatory Registration Required** - You must register first to get your Member ID (SVSxxxxxx).
 *     tags:
 *       - Public - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberId
 *               - password
 *             properties:
 *               memberId:
 *                 type: string
 *                 example: SVS000001
 *               password:
 *                 type: string
 *                 example: adminpassword123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * 
 * /api/v1/profile:
 *   get:
 *     summary: Get logged in user profile (User only)
 *     description: |
 *       **User Access Only** - Retrieve your complete profile information including bank details.
 *     tags:
 *       - User - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     bankAccount:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * 
 *   patch:
 *     summary: Update profile details (User only)
 *     description: |
 *       **User Access Only** - Update your profile information.
 *       
 *       **🔒 LOCKED FIELDS (Cannot be updated by users):**
 *       - `fullName` - Admin-only field
 *       - `kyc` - KYC documents submitted via `/api/v1/kyc/submit` (one-time only)
 *       
 *       **⚠️ ONE-TIME ONLY FIELDS (Can only be set once, then locked):**
 *       - `panCardNumber` - Can be added once. After that, contact admin to modify
 *       - `aadharCardNumber` - Can be added once. After that, contact admin to modify
 *       - `bankDetails` - Can be set once. After that, contact admin to modify
 *       
 *       **✅ UPDATABLE FIELDS:**
 *       - `email` - Email address (must be unique)
 *       - `phone` - Phone number (must be unique)
 *       - `username` - Username
 *       - `profilePicture` - Profile picture upload
 *       - `address` - Full address object (can be updated anytime)
 *       
 *       **Important Notes:**
 *       - First-time users can add PAN, Aadhar, and Bank Details
 *       - Once these fields are set, they become locked for security
 *       - Contact admin if you need to modify locked fields
 *       - Maximum 3 accounts allowed per PAN card
 *     tags:
 *       - User - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *                 description: Email address (updatable)
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *                 description: Phone number (updatable, must be unique)
 *               panCardNumber:
 *                 type: string
 *                 example: "ABCDE1234F"
 *                 description: PAN card number (ONE-TIME ONLY - cannot modify after first set)
 *               aadharCardNumber:
 *                 type: string
 *                 example: "123456789012"
 *                 description: Aadhar card number (ONE-TIME ONLY - cannot modify after first set)
 *               username:
 *                 type: string
 *                 example: john_doe
 *                 description: Username (updatable)
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture file (updatable)
 *               address:
 *                 type: object
 *                 description: Address object as JSON string (updatable anytime)
 *                 example: '{"street":"123 Main St","city":"Mumbai","state":"Maharashtra","zipCode":"400001"}'
 *               bankDetails:
 *                 type: object
 *                 description: Bank details as JSON string (ONE-TIME ONLY - cannot modify after first set)
 *                 example: '{"accountName":"John Doe","accountNumber":"1234567890","bankName":"HDFC Bank","ifscCode":"HDFC0001234","branch":"Mumbai"}'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /api/v1/kyc/submit:
 *   post:
 *     summary: Submit KYC documents - One-time only (User only)
 *     description: |
 *       **User Access Only** - Submit your KYC (Know Your Customer) documents for verification.
 *       
 *       **One-time submission** - You can only submit KYC documents once. Make sure all details are correct.
 *     tags:
 *       - User - KYC
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - aadhaarNumber
 *               - panCardNumber
 *               - aadhaarFront
 *               - aadhaarBack
 *               - panImage
 *             properties:
 *               aadhaarNumber:
 *                 type: string
 *               panCardNumber:
 *                 type: string
 *               aadhaarFront:
 *                 type: string
 *                 format: binary
 *               aadhaarBack:
 *                 type: string
 *                 format: binary
 *               panImage:
 *                 type: string
 *                 format: binary
 *               bankDetails:
 *                 type: object
 *                 description: JSON string if using multipart/form-data
 *     responses:
 *       200:
 *         description: KYC submitted successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * 
 * /api/v1/forgot-password:
 *   post:
 *     summary: Request Password Reset
 *     tags: [Public - Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset email sent
 *       404:
 *         description: Email not found
 * 
 * /api/v1/reset-password/{resetToken}:
 *   patch:
 *     summary: Reset Password using Token
 *     tags: [Public - Auth]
 *     parameters:
 *       - in: path
 *         name: resetToken
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Invalid or expired token
 */
