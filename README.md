# 📊 SSVPL MLM Solutions - Enterprise Backend

> **Production-Grade Backend System for Multi-Level Marketing Business Operations**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.1-47A248.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Data Models](#-data-models)
- [API Endpoints](#-api-endpoints)
- [Business Logic Services](#-business-logic-services)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Scripts & Utilities](#-scripts--utilities)
- [Authentication & Authorization](#-authentication--authorization)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)

---

## 🎯 Overview

**SSVPL MLM Solutions Backend** is an enterprise-grade Node.js/Express application designed to power a comprehensive Multi-Level Marketing (MLM) ecosystem. The system handles complex network structures, commission calculations, inventory management, franchise operations, and financial workflows.

### Core Use Cases:
- **Binary MLM Tree Management** - Left/Right leg placement, sponsor tracking
- **Real-Time Commission Calculations** - Direct referral, rank bonuses, star matching, fast-track bonuses
- **Franchise Operations** - Inventory management, product requests, sales tracking
- **Financial Operations** - Wallet management, payout scheduling, TDS calculations
- **User Management** - KYC verification, multi-role authentication, profile management
- **Product Management** - Catalog, pricing (pv/bv/dp), categorization
- **Invoice Generation** - GST-compliant PDF invoices with Cloudinary storage

---

## ✨ Key Features

### 🌳 MLM Network Management
- **Binary Tree Structure**: Automatic left/right placement with recursive team counting
- **Genealogy Tracking**: Complete upline/downline visibility with visual tree representation
- **Team Analytics**: Active/inactive member counts per leg, PV/BV aggregations
- **Member Activation**: First-purchase based activation with upline notification

### 💰 Commission & Bonus System
- **Direct Referral Bonus**: 10% instant payout on downline first purchase
- **Rank-Based Bonuses**: Progressive rewards (₹25K - ₹10L) based on achieving ranks
- **Fast Track Bonus**: 6 daily closings with 5:1 PV/BV matching (₹500 per pair)
- **Star Matching Bonus**: 1 daily closing, unlimited carryforward (₹1000 per pair)
- **4 Special Funds**: Bike, House, Royalty, Super funds with specific eligibility

### 🏢 Franchise Management
- **Inventory Tracking**: Real-time stock levels, product-wise quantities
- **Product Requests**: Franchise→Admin requisition workflow
- **Sales to Users**: Direct user sales with automated PV/BV/activation triggers
- **Admin Transfers**: Admin→Franchise bulk product transfers

### 📄 Invoice & Documentation
- **GST-Compliant Invoices**: PDF generation with 14-column grid layout
- **Tax Intelligence**: Automatic IGST vs CGST+SGST based on state
- **Cloudinary Storage**: Public PDF URLs for permanent access
- **Email Delivery**: Automated invoice sending via Resend

### 🔒 Security & Authentication
- **JWT-Based Auth**: Secure token-based authentication
- **Role-Based Access Control (RBAC)**: User, Franchise, Admin roles
- **Password Encryption**: bcrypt hashing
- **Middleware Protection**: Route-level authentication guards

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[Mobile/Web Client]
    end
    
    subgraph "API Layer"
        B[Express App]
        C[Swagger Docs]
        D[Authentication Middleware]
    end
    
    subgraph "Controller Layer"
        E1[User Controllers]
        E2[Franchise Controllers]
        E3[Admin Controllers]
        E4[Auth Controllers]
        E5[Product Controllers]
    end
    
    subgraph "Service Layer"
        F1[Business Services]
        F2[Integration Services]
    end
    
    subgraph "Data Layer"
        G[(MongoDB)]
        H[Cloudinary]
        I[Resend Email]
    end
    
    A --> B
    B --> C
    B --> D
    D --> E1 & E2 & E3 & E4 & E5
    E1 & E2 & E3 & E4 & E5 --> F1 & F2
    F1 --> G
    F2 --> G & H & I
```

**Request Flow:**
1. Client sends HTTP request
2. Express middleware validates auth token
3. Controller receives request, validates input
4. Business service executes domain logic
5. Integration service handles external systems
6. Data persisted to MongoDB
7. Response returned to client

---

## 🛠️ Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Runtime** | Node.js 18+ (ES Modules) |
| **Framework** | Express.js 4.18 |
| **Database** | MongoDB 8.1 (Mongoose ODM) |
| **Authentication** | JWT (jsonwebtoken) |
| **File Storage** | Cloudinary |
| **Email** | Resend |
| **PDF Generation** | PDFKit |
| **Validation** | express-validator |
| **Security** | Helmet, CORS, bcryptjs |
| **Documentation** | Swagger (OpenAPI 3.0) |
| **Scheduling** | node-cron |
| **Logging** | Morgan |

---

## 📂 Project Structure

```
sarvasolution_backend/
│
├── src/
│   ├── app.js                    # Express app configuration
│   ├── server.js                 # Entry point
│   │
│   ├── config/                   # Configuration files
│   │   ├── db.js                 # MongoDB connection
│   │   ├── cloudinary.js         # Cloudinary setup
│   │   └── swagger.js            # Swagger config
│   │
│   ├── models/                   # Mongoose schemas (12 models)
│   │   ├── User.model.js         # User/Member schema
│   │   ├── Franchise.model.js    # Franchise vendor schema
│   │   ├── Product.model.js      # Product catalog
│   │   ├── FranchiseSale.model.js# Franchise→User sales
│   │   ├── FranchiseInventory.model.js
│   │   ├── Payout.model.js       # Financial payouts
│   │   ├── UserFinance.model.js  # Wallets, funds
│   │   ├── BVTransaction.model.js
│   │   ├── StockTransaction.model.js
│   │   ├── ProductRequest.model.js
│   │   ├── Invoice.model.js
│   │   └── BankAccount.model.js
│   │
│   ├── controllers/              # Request handlers
│   │   ├── admin/                # Admin operations (7 controllers)
│   │   │   ├── adminUser.controller.js
│   │   │   ├── product.controller.js
│   │   │   ├── franchise.controller.js
│   │   │   ├── payout.controller.js
│   │   │   ├── productRequest.controller.js
│   │   │   ├── stock.controller.js
│   │   │   └── bv.controller.js
│   │   ├── auth/                 # Authentication (2 controllers)
│   │   │   ├── register.controller.js
│   │   │   └── login.controller.js
│   │   ├── franchise/            # Franchise ops (4 controllers)
│   │   │   ├── sale.controller.js
│   │   │   ├── inventory.controller.js
│   │   │   ├── productRequest.controller.js
│   │   │   └── auth.controller.js
│   │   ├── user/                 # User ops (8 controllers)
│   │   │   ├── profile.controller.js
│   │   │   ├── update_profile.controller.js
│   │   │   ├── kyc.controller.js
│   │   │   ├── bv.controller.js
│   │   │   ├── team.controller.js
│   │   │   ├── rank.controller.js
│   │   │   ├── wallet.controller.js
│   │   │   └── product.controller.js
│   │   └── product/
│   │       └── product.controller.js
│   │
│   ├── services/
│   │   ├── business/             # Domain logic (8 services)
│   │   │   ├── mlm.service.js    # MLM tree operations
│   │   │   ├── matching.service.js # Fast-track/Star matching
│   │   │   ├── bonus.service.js  # Direct/rank bonuses
│   │   │   ├── rank.service.js   # Rank progression
│   │   │   ├── sales.service.js  # Sales processing
│   │   │   ├── payout.service.js # Payout scheduling
│   │   │   ├── cron.service.js   # Scheduled jobs
│   │   │   └── user.service.js
│   │   └── integration/          # External services (6 services)
│   │       ├── email.service.js  # Resend email
│   │       ├── mail.service.js
│   │       ├── cloudinary.service.js # Image/PDF upload
│   │       ├── pdf.service.js    # Invoice generation
│   │       ├── emailTemplates.js
│   │       └── vendorId.service.js
│   │
│   ├── routes/                   # API routes
│   │   └── v1/
│   │       ├── public/           # Unauthenticated
│   │       │   ├── auth.routes.js
│   │       │   ├── health.routes.js
│   │       │   └── product.routes.js
│   │       ├── user.routes.js    # User-protected
│   │       ├── franchise.routes.js # Franchise-protected
│   │       └── admin.routes.js   # Admin-protected
│   │
│   ├── middlewares/
│   │   ├── auth/                 # Authentication
│   │   │   ├── authMiddleware.js
│   │   │   ├── adminMiddleware.js
│   │   │   └── franchiseAuthMiddleware.js
│   │   ├── error/
│   │   │   └── errorHandler.js
│   │   ├── upload/
│   │   │   ├── uploadMiddleware.js
│   │   │   └── cloudinaryUpload.js
│   │   └── validation/
│   │       ├── userValidation.js
│   │       ├── productValidation.js
│   │       └── payoutValidation.js
│   │
│   ├── docs/                     # Swagger documentation (15 files)
│   │   ├── components.docs.js    # Shared schemas
│   │   ├── user.docs.js
│   │   ├── admin.docs.js
│   │   ├── franchise.docs.js
│   │   └── ...
│   │
│   ├── jobs/                     # Cron jobs
│   │   └── scheduler.js
│   │
│   ├── utils/                    # Helper utilities
│   │   ├── ApiResponse.js
│   │   ├── ApiError.js
│   │   └── asyncHandler.js
│   │
│   ├── templates/                # Email templates
│   │   └── email/
│   │
│   └── scripts/                  # Maintenance scripts (4 core)
│       ├── updateFirstPurchaseStatus.js
│       ├── resetDatabase.js
│       ├── populateData.js
│       └── syncDatabase.js
│
├── scripts/                      # Additional utility scripts (24 total)
│   ├── database-sync.js
│   ├── populate-real-data.js
│   ├── recalculateTeamCounts.js
│   └── ...
│
├── .env                          # Environment variables
├── package.json
├── README.md                     # This file
└── ...guides/documentation
```

---

## 💾 Data Models

### 1. **User** (`User.model.js`)
**Purpose**: Core member/user entity with MLM network structure

**Key Fields**:
```javascript
{
  // Identity
  memberId: "SVS000001",          // Unique ID
  fullName: String,
  email: String,
  phone: String,
  password: String (hashed),
  
  // MLM Structure
  sponsorId: String,              // Referrer
  parentId: ObjectId,             // Binary tree parent
  position: "left" | "right" | "root",
  
  // Status & Activation
  status: "active" | "inactive" | "blocked",
  isFirstPurchaseDone: Boolean,
  joiningDate: Date,
  
  // Financial Tracking
  personalPV: Number,             // Own purchases
  personalBV: Number,
  totalPV: Number,                // Personal + Downline
  totalBV: Number,
  leftLegBV: Number,              // Leg-wise BV
  rightLegBV: Number,
  
  // MLM Metrics
  currentRank: String,            // Associate → Crown Ambassador
  leftTeamCount: Number,          // Recursive team size
  rightTeamCount: Number,
  leftDirectActive: Number,       // Direct referrals
  rightDirectActive: Number,
  
  // Address
  address: {
    street, city, state, zipCode, country
  },
  
  // KYC
  panCardNumber: String,
  aadharNumber: String,
  kycStatus: "pending" | "verified" | "rejected",
  
  // Profile
  profilePicture: { url, publicId }
}
```

---

### 2. **Franchise** (`Franchise.model.js`)
**Purpose**: Franchise vendor/distributor entity

**Key Fields**:
```javascript
{
  vendorId: "VEN000001",
  name: String,
  shopName: String,
  email: String,
  phone: String,
  password: String (hashed),
  
  city: String,
  shopAddress: {
    street, landmark, pincode, state,
    coordinates: { latitude, longitude }
  },
  
  status: "active" | "blocked" | "pending",
  
  // Metrics
  totalOrders: Number,
  totalRevenue: Number,
  commissionEarned: Number
}
```

---

### 3. **Product** (`Product.model.js`)
**Purpose**: Product catalog with MLM pricing

**Key Fields**:
```javascript
{
  productName: String,
  description: String,
  
  // Pricing
  price: Number,                  // Base selling price
  mrp: Number,                    // Maximum retail price
  productDP: Number,              // Dealer/Distribution price
  
  // MLM Values
  pv: Number,                     // Point Value
  bv: Number,                     // Business Volume
  
  // Tax
  gst: Number,
  cgst: Number,
  sgst: Number,
  finalPrice: Number (auto-calculated),
  
  // Classification
  category: String,               // aquaculture, agriculture, etc.
  hsnCode: String,
  batchNo: String,
  
  // Inventory
  stockQuantity: Number,
  isInStock: Boolean,
  
  // Status
  isActive: Boolean,
  isActivationPackage: Boolean,   // Can activate user
  
  productImage: { url, publicId }
}
```

---

### 4. **FranchiseSale** (`FranchiseSale.model.js`)
**Purpose**: Tracks franchise→user sales with invoice data

**Key Fields**:
```javascript
{
  saleNo: "FS-2025-00001",
  saleDate: Date,
  
  franchise: ObjectId,
  user: ObjectId,
  memberId: String,
  
  items: [{
    product: ObjectId,
    quantity: Number,
    price, productDP, pv, bv,
    totalPV, totalBV, amount,
    hsnCode: String
  }],
  
  // Financials
  subTotal: Number,
  gstRate: Number,
  gstAmount: Number,
  grandTotal: Number,
  totalPV: Number,
  totalBV: Number,
  
  // Activation Tracking
  isFirstPurchase: Boolean,
  userActivated: Boolean,
  
  // Payment
  paymentMethod: "cash" | "card" | "upi" | "bank_transfer",
  paymentStatus: "pending" | "paid",
  
  // Invoice PDF
  pdfUrl: String,                 // Cloudinary URL
  pdfPublicId: String
}
```

---

### 5. **UserFinance** (`UserFinance.model.js`)
**Purpose**: User wallet and special funds

**Key Fields**:
```javascript
{
  user: ObjectId,
  memberId: String,
  
  // Wallet
  wallet: {
    totalEarnings: Number,
    availableBalance: Number,
    withdrawnAmount: Number
  },
  
  // 4 Special Funds
  bikeFund: {
    balance: Number,
    isEligible: Boolean,
    eligibilityDate: Date
  },
  houseFund: { ... },
  royaltyFund: { ... },
  superFund: { ... },
  
  // Fast Track Bonus
  fastTrack: {
    dailyClosings: Number,        // Max 6/day
    pendingLeft: Number,
    pendingRight: Number,
    carryForwardLeft: Number,
    carryForwardRight: Number,
    nextClosingWindow: Date
  },
  
  // Star Matching Bonus
  starMatching: {
    dailyClosings: Number,        // Max 1/day
    pendingStarsLeft: Number,
    pendingStarsRight: Number
  }
}
```

---

### 6. **Payout** (`Payout.model.js`)
**Purpose**: Financial payout/withdrawal tracking

**Key Fields**:
```javascript
{
  user: ObjectId,
  memberId: String,
  
  payoutType: "direct-referral" | "rank-bonus" | 
              "fast-track-bonus" | "star-matching-bonus" | 
              "withdrawal" | "fast-track-deduction",
  
  grossAmount: Number,
  adminCharge: Number (5%),
  tdsDeducted: Number (2%),
  netAmount: Number,
  
  status: "pending" | "processing" | "completed" | "failed",
  
  scheduledFor: Date,             // Friday 11 AM IST
  processedAt: Date
}
```

---

### 7. **FranchiseInventory** (`FranchiseInventory.model.js`)
```javascript
{
  franchise: ObjectId,
  product: ObjectId,
  stockQuantity: Number,
  
  // Product snapshot
  pv, bv, productDP,
  
  lastRestocked: Date
}
```

---

### 8. **ProductRequest** (`ProductRequest.model.js`)
```javascript
{
  franchise: ObjectId,
  product: ObjectId,
  requestedQuantity: Number,
  
  status: "pending" | "approved" | "rejected",
  
  approvedBy: ObjectId,
  approvedAt: Date,
  rejectionReason: String
}
```

---

## 🌐 API Endpoints

### 📌 Public Routes (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | User registration |
| `POST` | `/api/v1/auth/login` | User login |
| `POST` | `/api/v1/franchise/auth/login` | Franchise login |
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/products` | Public product catalog |
| `GET` | `/api-docs` | Swagger documentation |

---

### 👤 User Routes (Auth Required)

#### Profile & Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/profile` | Get user profile |
| `PUT` | `/api/v1/profile` | Update profile |
| `PUT` | `/api/v1/profile/picture` | Upload profile picture |
| `GET` | `/api/v1/user/first-purchase-status` | Check first purchase flag |

#### KYC
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/user/kyc/upload` | Upload KYC documents |
| `GET` | `/api/v1/user/kyc/status` | Get KYC status |

#### Financial
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/user/wallet` | Wallet balance & history |
| `POST` | `/api/v1/user/request-payout` | Request withdrawal |
| `GET` | `/api/v1/user/payouts` | Payout history |
| `GET` | `/api/v1/user/bv-summary` | BV balance & transactions |
| `GET` | `/api/v1/user/funds-status` | 4 Funds status |
| `GET` | `/api/v1/user/bonus-status` | Fast-track & Star matching |

#### Team & MLM
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/user/tree/:memberId?` | Genealogy tree |
| `GET` | `/api/v1/user/tree_view` | Simplified tree view |
| `GET` | `/api/v1/user/direct-team` | Direct referrals list |
| `GET` | `/api/v1/user/team/complete` | Complete downline (recursive) |

---

### 🏢 Franchise Routes (Franchise Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/franchise/inventory` | View stock |
| `POST` | `/api/v1/franchise/request/product` | Request products from admin |
| `GET` | `/api/v1/franchise/requests` | View product request history |
| `GET` | `/api/v1/franchise/sale/user/:memberId` | Lookup user by Member ID |
| `POST` | `/api/v1/franchise/sale/sell` | Sell products to user |
| `GET` | `/api/v1/franchise/sales` | Sales history |

---

### 🔐 Admin Routes (Admin Auth)

#### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/users` | List all users |
| `GET` | `/api/v1/admin/users/:memberId` | Get user details |
| `PUT` | `/api/v1/admin/users/:memberId/status` | Update user status |
| `GET` | `/api/v1/admin/kyc/pending` | Pending KYC requests |
| `PUT` | `/api/v1/admin/kyc/:userId/verify` | Approve/reject KYC |

#### Product Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/admin/products` | Create product |
| `GET` | `/api/v1/admin/products` | List products |
| `PUT` | `/api/v1/admin/products/:id` | Update product |
| `DELETE` | `/api/v1/admin/products/:id` | Soft delete product |

#### Franchise Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/admin/franchise` | Create franchise |
| `GET` | `/api/v1/admin/franchises` | List franchises |
| `PUT` | `/api/v1/admin/franchise/:id/block` | Block/unblock franchise |

#### Stock & Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/admin/stock/transfer` | Transfer stock to franchise |
| `GET` | `/api/v1/admin/stock/transactions` | Stock transaction history |
| `GET` | `/api/v1/admin/franchise/requests` | Pending product requests |
| `PUT` | `/api/v1/admin/franchise/request/:id/approve` | Approve request |
| `PUT` | `/api/v1/admin/franchise/request/:id/reject` | Reject request |

#### Payouts
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/payouts` | All payout requests |
| `PUT` | `/api/v1/admin/payout/:id/approve` | Approve payout |
| `PUT` | `/api/v1/admin/payout/:id/reject` | Reject payout |

---

## ⚙️ Business Logic Services

### 1. **MLM Service** (`mlm.service.js`)
**Purpose**: Binary tree operations

**Functions**:
- `findNextAvailablePosition(sponsorId, preferredLeg)` - Auto-placement logic
- `calculateTeamCounts(userId)` - Recursive left/right team size
- `updateUplineBV(userId, pvAmount, bvAmount)` - Propagate BV upwards
- `getGenealogyTree(userId, depth)` - Fetch tree structure

---

### 2. **Matching Service** (`matching.service.js`)
**Purpose**: Fast-track and star matching bonus calculations

**Functions**:
- `processFastTrackMatching(userId)` - 5:1 PV/BV pairing (max 6/day)
- `processStarMatching(userId)` - Star-based pairing (1/day)
- `creditFastTrackBonus(userId, pairs)` - ₹500 per pair
- `creditStarMatchingBonus(userId, pairs)` - ₹1000 per pair

**Logic**:
```javascript
// Fast Track: 5:1 ratio
const pairs = Math.min(
  Math.floor(leftLegPV / 5),
  rightLegBV
);
const bonusAmount = pairs * 500;
```

---

### 3. **Bonus Service** (`bonus.service.js`)
**Purpose**: Direct referral and rank bonuses

**Functions**:
- `processDirectReferralBonus(sponsorId, firstPurchaseAmount)` - 10% of downline first purchase
- `processRankBonus(userId)` - One-time rank achievement bonus
- `calculateRankBonus(rank)` - ₹25K → ₹10L based on rank

---

### 4. **Rank Service** (`rank.service.js`)
**Purpose**: Rank progression logic

**Ranks**:
1. Associate (default)
2. Star (Business Development star)
3. Bronze, Silver, Gold, Platinum, Diamond
4. Blue Diamond, Black Diamond, Royal Diamond, Crown Diamond
5. Ambassador, Crown Ambassador, SSVPL Legend

**Functions**:
- `checkRankEligibility(userId)` - Evaluate rank progression
- `promoteUser(userId, newRank)` - Update rank and trigger bonus

---

### 5. **Sales Service** (`sales.service.js`)
**Purpose**: Process franchise→user sales

**Functions**:
- `processSale(franchiseId, userId, items)` - Complete sale workflow
- `updateUserPV(userId, pvAmount, bvAmount)` - Update user metrics
- `checkActivation(userId)` - Determine if user activates
- `generateInvoice(saleData)` - Create PDF invoice

---

### 6. **Payout Service** (`payout.service.js`)
**Purpose**: Withdrawal scheduling

**Functions**:
- `scheduleWithdrawal(userId, amount)` - Create payout request
- `processPendingPayouts()` - Friday 11 AM IST execution
- `calculateDeductions(grossAmount)` - Admin charge (5%) + TDS (2%)

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ 
- MongoDB 6+
- Cloudinary account
- Resend API key

### Steps

```bash
# 1. Clone repository
git clone https://github.com/your-org/sarvasolution_backend.git
cd sarvasolution_backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 4. Start development server
npm run dev

# 5. (Optional) Seed database
node scripts/populate-real-data.js
```

---

## 🔐 Environment Variables

Create a `.env` file with:

```bash
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/sarvasolution
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sarvasolution

# Authentication
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRES_IN=30d

# Cloudinary (Image/PDF Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

# Optional: SMTP (if using nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

---

## 📜 Scripts & Utilities

### Available NPM Scripts

```bash
npm start          # Production server
npm run dev        # Development with nodemon
npm run lint       # ESLint check
npm run fix        # Auto-fix lint issues
npm run migrate    # Run migrations
```

### Maintenance Scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| `populate-real-data.js` | Seed database with sample MLM network |
| `database-sync.js` | Sync production→local database |
| `reset-database.js` | Clean slate reset |
| `recalculateTeamCounts.js` | Recompute team counts |
| `updateFirstPurchaseStatus.js` | Migrate first purchase flags |
| `testEmail.js` | Test email service |

**Example Usage**:
```bash
node scripts/populate-real-data.js
node src/scripts/updateFirstPurchaseStatus.js
```

---

## 🔒 Authentication & Authorization

### JWT Token Structure

```javascript
{
  userId: "64abc123...",
  memberId: "SVS000001",
  role: "user" | "franchise" | "admin",
  iat: 1234567890,
  exp: 1234567890
}
```

### Middleware Protection

```javascript
// User-protected route
router.get('/profile', authMiddleware, getProfile);

// Admin-only route
router.get('/users', authMiddleware, adminMiddleware, getAllUsers);

// Franchise-only route
router.get('/inventory', franchiseAuthMiddleware, getInventory);
```

### Password Security
- **Hashing**: bcrypt with 10 salt rounds
- **Storage**: Never stored in plain text
- **Reset**: Token-based password reset (if implemented)

---

## 📖 API Documentation

### Swagger UI
Access interactive API docs at:
```
http://localhost:5000/api-docs
```

**Features**:
- ✅ Try endpoints directly in browser
- ✅ Organized by role (Public, User, Franchise, Admin)
- ✅ Complete request/response schemas
- ✅ Authentication testing

---

## 🌍 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use production MongoDB URI
- [ ] Set strong `JWT_SECRET`
- [ ] Configure Cloudinary production account
- [ ] Set up Resend production domain
- [ ] Enable HTTPS
- [ ] Configure CORS for production domain
- [ ] Set up monitoring (PM2, New Relic, etc.)
- [ ] Configure log rotation
- [ ] Set up database backups

### Deployment Platforms

**Recommended**:
- **Backend**: Railway, Render, DigitalOcean
- **Database**: MongoDB Atlas
- **File Storage**: Cloudinary
- **Email**: Resend

### PM2 Production Setup

```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start src/server.js --name sarvasolution

# Auto-restart on reboot
pm2 startup
pm2 save
```

---

## 📊 Database Relationships

```mermaid
erDiagram
    User ||--o{ User : "sponsors/refers"
    User ||--|| UserFinance : "has"
    User ||--o{ Payout : "requests"
    User ||--o{ BVTransaction : "has"
    User ||--o{ FranchiseSale : "purchases_from"
    
    Franchise ||--o{ FranchiseInventory : "manages"
    Franchise ||--o{ FranchiseSale : "sells"
    Franchise ||--o{ ProductRequest : "requests"
    
    Product ||--o{ FranchiseInventory : "stocked_in"
    Product ||--o{ FranchiseSale : "sold_in"
    Product ||--o{ ProductRequest : "requested"
    
    Admin ||--o{ StockTransaction : "transfers"
    Admin ||--o{ Payout : "approves"
```

---

## 🎯 Key Business Rules

1. **Activation**: User activates on first purchase with PV ≥ 1
2. **Binary Placement**: Auto-placement in weaker leg if sponsor's position full
3. **Fast Track**: Max 6 closings/day, 5:1 PV/BV ratio required
4. **Star Matching**: Max 1 closing/day, unlimited carryforward
5. **Withdrawal**: Minimum ₹450, scheduled for Friday 11 AM IST
6. **TDS**: 2% deducted from all payouts
7. **Admin Charge**: 5% on withdrawals
8. **Direct Referral**: 10% bonus on downline's first purchase only

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: JWT token invalid
```bash
# Solution: Regenerate JWT_SECRET and restart
```

**Issue**: MongoDB connection failed
```bash
# Check MONGODB_URI format
# Verify network access in MongoDB Atlas
```

**Issue**: Cloudinary upload fails
```bash
# Verify CLOUDINARY credentials
# Check file size limits
```

---

## 📝 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -m 'Add feature'`
3. Push: `git push origin feature/my-feature`
4. Open Pull Request

---

## 📄 License

ISC License - See LICENSE file

---

## 👥 Team

**SSVPL Tech Team** - Enterprise MLM Solutions

---

## 📞 Support

For issues or questions:
- **Email**: support@sarvasolution.com
- **Documentation**: [Internal Wiki]
- **Issue Tracker**: [GitHub Issues]

---

**Last Updated**: February 2026  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
