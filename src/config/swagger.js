import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SSVPL MLM Backend API',
            version: '2.0.0',
            description: `
## Welcome to SSVPL MLM System API
This documentation covers the full SSVPL Multi-Level Marketing ecosystem.

### 🚀 Key Workflows
1. **Registration**: 
   - Mandatory Fields: sponsorId, email, phone, fullName, panCardNumber, password.
   - Flow: System validates sponsor -> Finds placement (Extreme Left Spillover) -> Generates unique Member ID -> Propagates 500 BV starting package up the tree.
2. **Authentication**:
   - **Restriction**: Users CANNOT log in without first being registered.
   - Login requires **Member ID** (e.g., SVS000001) and password.
3. **KYC Lifecycle**:
   - Users submit Aadhaar and PAN documents (allowed once).
   - Admin reviews and approves/rejects via the Admin Panel.
4. **Binary Matching & Payouts**:
   - **Eligibility**: Requires at least 2 Direct Sponsors.
   - **Matching**: 2:1/1:2 for the first payout, 1:1 thereafter at 10% commission.
   - **Closings**: Weekly (Friday 11 AM) and Monthly automated processing.

### ⚖️ Business Rules
- **Minimum Withdrawal**: ₹450 (after 5% Admin Charge).
- **Auto-Deduction**: 100% of the matching bonus at the 3rd, 6th, 9th, and 12th matching events is auto-deducted for rank advancement.
- **PAN Limit**: Max 3 accounts per PAN card.
            `,
        },
        servers: [
            {
                url: 'https://sarvasolution-backend-production-v2.onrender.com',
                description: 'Production server',
            },
            {
                url: `http://localhost:${process.env.PORT || 8000}`,
                description: 'Local development server',
            },
        ],
    },
    apis: ['./src/docs/*.js', './src/routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
