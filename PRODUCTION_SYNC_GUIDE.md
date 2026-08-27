# Production Database Sync Guide

## Issue
Your production database on Render still has incorrect TDS values (showing 0 instead of proper 2% deduction).

## Solution

You have **3 options** to fix this:

### Option 1: Use Admin API Endpoint (EASIEST - RECOMMENDED) ⭐

1. Go to your Swagger UI: `https://sarvasolution-backend.onrender.com/api-docs`
2. Find the endpoint: **POST /api/v1/admin/fix-database**
3. Click "Try it out"
4. Enter your admin Bearer token
5. Execute

This will fix:
- ✅ TDS deductions (2%) in all payouts
- ✅ Rank inconsistencies (e.g., Gold with 0 stars)
- ✅ Missing finance records
- ✅ Wallet balance recalculations

### Option 2: Run Production Sync Script Locally

```bash
# Make sure your .env has the production MongoDB URI
node scripts/sync_production.js
```

or use the helper script:

```bash
./scripts/run_production_sync.sh
```

### Option 3: Deploy Fix and Auto-Run on Server

Commit and push the new endpoint, then call it once via API.

## What Gets Fixed

### TDS Deduction
- **Before**: `grossAmount: 500, adminCharge: 25, tdsDeducted: 0, netAmount: 475`
- **After**: `grossAmount: 500, adminCharge: 25, tdsDeducted: 10, netAmount: 465`

### Rank Validation
- **Before**: `currentRank: "Gold", starMatching: 0` ❌
- **After**: `currentRank: "Associate", starMatching: 0` ✅

## Verification

After running the fix, check:

```bash
GET /api/v1/user/wallet
```

You should see:
- `tdsDeducted` changed from 0 to 10
- `netAmount` changed from 475 to 465
- `totalEarnings` and `availableBalance` updated accordingly

## Files Created

- `scripts/sync_production.js` - Main sync script
- `scripts/run_production_sync.sh` - Helper bash script
- `src/controllers/admin/fixDatabase.controller.js` - Admin API endpoint
- `src/routes/adminRoutes.js` - Route added: POST /api/v1/admin/fix-database

## Notes

⚠️ **This only needs to be run ONCE** to fix existing data
✅ All **future** payouts will automatically calculate TDS correctly
🔒 The admin endpoint requires authentication and admin role
