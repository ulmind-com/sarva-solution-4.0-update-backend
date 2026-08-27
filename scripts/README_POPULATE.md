# SSVPL MLM Realistic Data Population Script

## Quick Start

```bash
# Preview what will be created (recommended first step)
node scripts/populate-real-data.js --dry-run

# Generate full 243-user ecosystem
node scripts/populate-real-data.js --generate

# Create smaller test tree (31 users, levels 0-3)
node scripts/populate-real-data.js --level=3

# Reproducible data with seed
node scripts/populate-real-data.js --generate --seed=1234
```

## What It Creates

- **243 Users** in perfect 5-level binary tree
- **500+ Payouts** with correct TDS (₹10 on ₹500, ₹30 on ₹1500)
- **Realistic Financial Data** with Fast Track & Star Matching earnings
- **Active/Inactive Distribution:** 60% active (147), 40% inactive (96)
- **Rank Distribution:** 1 Gold, 2 Silver, 3 Bronze, ~18 Star, rest Associate
- **BV Transactions** with proper propagation

## User Distribution

| Level | Count | Active % | Member IDs |
|-------|-------|----------|------------|
| 0 | 1 | 100% | SVS000001 |
| 1 | 2 | 100% | SVS000002-003 |
| 2 | 4 | 75% | SVS000004-007 |
| 3 | 24 | 60% | SVS000008-031 |
| 4 | 96 | 40% | SVS000032-127 |
| 5 | 116 | 20% | SVS000128-243 |

## Root User (SVS000001)

- **Rank:** Gold
- **Fast Track:** 45 matches = ₹20,925
- **Star Matching:** 120 matches = ₹167,400
- **Rank Bonus:** ₹10,000
- **Total Earnings:** ₹198,325
- **Left Leg BV:** 85,000
- **Right Leg BV:** 72,000

## Features

✅ Transaction support with automatic rollback  
✅ Dry-run mode for safe preview  
✅ Comprehensive validation (TDS, ranks, tree integrity)  
✅ Idempotent (safe to rerun)  
✅ Detailed JSON reports  
✅ Staggered dates (30-90 days range)  
✅ Proper carry forward values for testing  

## Verification

After running, verify with:

```bash
# Check existing verification scripts
node scripts/verifyTeamCounts.js
node scripts/verify_final_logic.js
node scripts/test_bonus_system.js
```

Or check database directly:
```javascript
db.users.count()           // Should be 243
db.userfinances.count()    // Should be 243
db.payouts.count()         // Should be 500+
```

## ⚠️ WARNING

**This script DELETES all existing users (except SVS000001)!**

- Always run `--dry-run` first
- Never use in production
- Intended for development/testing only

## Documentation

See [walkthrough.md](file:///home/zephyrus/.gemini/antigravity/brain/303f1ae3-5a97-46e1-aad1-f9e6cc7dfd9e/walkthrough.md) for detailed implementation documentation.
