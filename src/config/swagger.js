import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SSVPL MLM Backend API',
            version: '4.0.0',
            description: `
## Welcome to SSVPL MLM System API
This documentation covers the full SSVPL Multi-Level Marketing ecosystem.

### 🚀 Key Workflows
1. **Registration**:
   - Mandatory Fields: sponsorId, email, phone, fullName, panCardNumber, password.
   - Phone OTP is verified first, unless \`OTP_VERIFICATION_REQUIRED\` is set to \`false\`.
   - Flow: System validates sponsor -> Finds placement (Extreme Left Spillover) -> Generates unique Member ID. The account starts **inactive** with no volume.
2. **Activation**:
   - A member is activated by their **first purchase at a franchise**, which is the only purchase that generates PV. Every purchase after that generates BV instead.
   - Minimum 0.5 PV. PV counts in fixed 0.5 steps and is **capped at 1 PV per member**: 0.5–0.99 counts as 0.5, and anything from 1 upwards counts as 1. The rest is flushed out.
   - The bill records what was actually bought; only the counted part reaches the binary legs and the franchise commission.
3. **Authentication**:
   - **Restriction**: Users CANNOT log in without first being registered.
   - Login requires **Member ID** (e.g., SVS000001) and password.
4. **KYC Lifecycle**:
   - Users submit Aadhaar and PAN documents (allowed once).
   - Admin reviews and approves/rejects via the Admin Panel.
5. **Binary Matching & Payouts**:
   - **Eligibility**: At least one **active direct** member on the left and one on the right.
   - **Matching**: 1 PV : 2 PV (either side may be the heavy side) for the first payout, then 1 PV : 1 PV. Unmatched PV carries forward.
   - **Closings**: No time windows — a match closes as soon as the PV is there. Up to **9 closings per day** (IST); anything matched after that is flushed out, consuming the PV without paying.
   - **Payout**: ₹500 gross per match, less 10% admin charge, 2% TDS and 8% Savings Wallet.

### ⚖️ Business Rules
- **Deduction Closings**: Every 3rd valid payout is fully deducted for rank advancement — 3, 6, 9, 12, 15, 18 and onwards, for the life of the account. The counter is cumulative, so each day carries on from where the last one stopped. The 12th closing also makes the member a **Star**, which propagates up the tree.
- **Withdrawals**: Deducted by the member's configured admin charge percentage plus 2% TDS.
- **PAN Limit**: One account per PAN card.
- **Phone Limit**: Max 3 accounts per mobile number.
- **Franchise Commission**: ₹40 per activation PV and 10% of repurchase BV, each less 5% admin charge and 2% TDS. Generated monthly on the 1st for the previous month.
            `,
        },
        servers: [
            {
                url: 'https://sarvasolution-backend-3-0.onrender.com',
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
