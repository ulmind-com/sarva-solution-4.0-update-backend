# DATABASE RESET SCRIPT - COMPLETE GUIDE

## 🚨 CRITICAL: Full Database Normalization

This script performs **COMPLETE database reset** to normalize all existing users created before proper SSVPL MLM logic implementation.

⚠️ **WARNING**: This resets ALL users to Associate rank and clears all closing histories!

---

## EXECUTION MODES

### 1. DRY-RUN (Preview Only - START HERE)
```bash
node scripts/reset-database.js --dry-run
```
- **Safe**: Shows what would change without making changes
- **Purpose**: Preview all operations before executing

### 2. FIX TDS ONLY (Recommended First Step)
```bash
node scripts/reset-database.js --fix-tds-only
```
- **Fixes**: Only TDS deductions on existing payouts
- **Safe**: Doesn't reset ranks or clear histories
- **Purpose**: Fix financial errors without full reset

### 3. BACKUP MODE (Creates Backup + Executes)
```bash
node scripts/reset-database.js --backup
```
- **Backup**: Creates MongoDB dump first
- **Executes**: Runs TDS fix + creates missing finance records
- **Safe**: Can restore from backup if needed

### 4. FULL RESET (⚠️ Complete Normalization)
```bash
node scripts/reset-database.js --full-reset
```
- **⚠️ WARNING**: Resets EVERYTHING to starting state
- **Includes**:
  - Fix TDS on all payouts
  - Create missing UserFinance records
  - Reset ALL users to Associate rank
  - Clear all closing histories
  - Normalize wallet balances to legitimate earnings only
  - Validate and fix genealogy tree

---

## WHAT EACH PHASE DOES

### Phase 1: Backup & Snapshot
- Creates MongoDB dump: `./backups/reset-backup-TIMESTAMP/`
- Exports SVS000001 baseline: `svs000001-baseline.json`
- Counts total users, payouts, finance records

### Phase 2: Fix TDS Critical Error
**Before:**
```json
{
  "gross Amount": 500,
  "adminCharge": 25,
  "tdsDeducted": 0,    ❌
  "netAmount": 475     ❌
}
```

**After:**
```json
{
  "grossAmount": 500,
  "adminCharge": 25,
  "tdsDeducted": 10,   ✅ (2%)
  "netAmount": 465      ✅
}
```

**Overpayment Recovery:**
- Calculates: `₹475 - ₹465 = ₹10 overpaid`
- Deducts ₹10 from user's `wallet.availableBalance`
- Updates `wallet.totalEarnings`

### Phase 3: Create Missing UserFinance Records
- Finds users without `UserFinance` documents
- Creates proper structure with initialized fields:
  - `fastTrack`: all zeros, empty history
  - `starMatchingBonus`: all zeros, empty history
  - `wallet`: {totalEarnings: 0, availableBalance: 0}
  - `leftLegBV`: 0, `rightLegBV`: 0

### Phase 4: Reset All Users (FULL-RESET ONLY)
- Sets `currentRank = 'Associate'` for ALL users
- Clears `rankHistory = []`
- Resets all UserFinance Boolean flags:
  - `dailyClosings = 0`
  - `pendingPairLeft = 0`, `pendingPairRight = 0`
  - `carryForwardLeft = 0`, `carryForwardRight = 0`
  - `closingHistory = []`
  - `weeklyEarnings = 0`

### Phase 5: Normalize Wallet Balances (FULL-RESET ONLY)
- Recalculates earnings from **valid payouts only** (`tdsDeducted > 0`)
- Removes illegitimate earnings
- Sets:
  - `totalEarnings = SUM(valid payout netAmounts)`
  - `availableBalance = totalEarnings`
  - `pendingWithdrawal = 0`

### Phase 6: Validate Genealogy Tree (FULL-RESET ONLY)
- Sets root user (SVS000001): `parentId = null`
- Fixes orphaned users (invalid parentId):
  - Attaches them to root user
- Validates all parent-child relationships

### Phase 7: Final Report
- Generates comprehensive JSON report
- Validates:
  - 100% TDS compliance
  - All users have UserFinance
  - Tree structure validity
- Displays financial impact summary

---

## RECOMMENDED WORKFLOW

### Step 1: Preview Changes
```bash
node scripts/reset-database.js --dry-run
```
**Review console output carefully!**

### Step 2: Fix TDS First (No Reset)
```bash
node scripts/reset-database.js --backup
```
This:
- Creates backup
- Fixes TDS on all payouts
- Creates missing UserFinance records
- **Does NOT** reset ranks or clear histories

### Step 3: Verify TDS Fix
```bash
# Check your production API
curl -X GET https://sarvasolution-backend.onrender.com/api/v1/user/wallet \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Verify: `tdsDeducted: 10` (not 0)

### Step 4: Full Reset (If Needed)
```bash
node scripts/reset-database.js --full-reset
```
⚠️ **Only use this if you want to reset ALL users to starting state!**

---

## EXPECTED RESULTS

### After `--fix-tds-only` or `--backup`:
```json
{
  "operations": {
    "tdsFixed": 1,
    "overpaymentRecovered": 10,
    "financeRecordsCreated": 0
  },
  "postSync": {
    "payoutsWithTDS": "100%",
    "usersWithFinance": "100%"
  }
}
```

### After `--full-reset`:
```json
{
  "operations": {
    "tdsFixed": 1,
    "usersReset": 150,
    "walletsNormalized": 150
  },
  "postSync": {
    "associateUsers": 150,
    "payoutsWithTDS": "100%",
    "treeValidated": true
  }
}
```

---

## SAFETY FEATURES

✅ **MongoDB Transactions**: All-or-nothing (rollback on error)
✅ **Automatic Backup**: MongoDB dump before changes (full-reset mode)
✅ **Detailedlogging**: Every operation logged to console
✅ **JSON Audit Trail**: Saved to `sync-report-YYYY-MM-DD.json`
✅ **Dry-Run Mode**: Preview without changing database
✅ **Idempotent**: Safe to run multiple times

---

## OUTPUT FILES

### Backup (if --backup or --full-reset)
```
./backups/reset-backup-2026-02-02T18-30-00/
  ├── ssvpl_mlm/
  │   ├── users.bson
  │   ├── userfinances.bson
  │   ├── payouts.bson
  │   └── ...
  └── svs000001-baseline.json
```

### Audit Report
```
./sync-report-2026-02-02.json
```

---

## TROUBLESHOOTING

### "Backup failed" Error
```bash
# Install MongoDB Database Tools
sudo apt-get install mongodb-database-tools

# Or skip backup (only for testing!)
node scripts/reset-database.js --dry-run
```

### "Cannot connect to MongoDB"
```bash
# Check .env file
cat .env | grep MONGODB_URI

# Test connection
mongo "$MONGODB_URI" --eval "db.stats()"
```

### Restore from Backup
```bash
# If something goes wrong, restore:
mongorestore --uri="YOUR_MONGODB_URI" --drop ./backups/reset-backup-TIMESTAMP/
```

---

## POST-RESET VERIFICATION

### 1. Check TDS Fix
```bash
curl -X GET https://your-api.com/api/v1/user/wallet \
  -H "Authorization: Bearer TOKEN"
```
**Expected**: `tdsDeducted: 10`, `netAmount: 465`

### 2. Check Rank Reset (if full-reset)
```bash
curl -X GET https://your-api.com/api/v1/user/profile \
  -H "Authorization: Bearer TOKEN"
```
**Expected**: `currentRank: "Associate"`

### 3. Check Wallet Balance
**Expected**: Only legitimate earnings (from payouts with TDS > 0)

---

## WHEN TO USE EACH MODE

| Mode | Use When | Safe? |
|------|----------|-------|
| `--dry-run` | Always first! Preview changes | ✅ Yes |
| `--backup` | Fix TDS without resetting users | ✅ Yes (with backup) |
| `--fix-tds-only` | Only fix financial errors | ✅ Yes |
| `--full-reset` | Fresh start, normalize everything | ⚠️ Creates backup first |

---

## CRITICAL DECISION FLOWCHART

```
Do you want to reset ALL users to Associate rank?
├─ NO  → Use: --backup or --fix-tds-only
│         This fixes TDS errors without touching user progress
│
└─ YES → Use: --full-reset
          ⚠️ This resets EVERYTHING:
          - All users → Associate rank
          - Clear all closing histories
          - Remove invalid earnings
          - Fresh start
```

---

## SUPPORT

For issues:
1. Check `sync-report-*.json` for details
2. Review console output for errors
3. Restore from backup if needed
4. Run `--dry-run` first to preview

**Remember**: Always run `--dry-run` first to see what will change!
