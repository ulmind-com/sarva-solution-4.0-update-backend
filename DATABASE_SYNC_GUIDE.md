# DATABASE SYNC SCRIPT - COMPREHENSIVE GUIDE

## 🚨 CRITICAL DATA INTEGRITY FIXES

This script fixes the following production issues:
- ✅ TDS deduction errors (₹10 missing per payout)
- ✅ Invalid rank assignments (Gold with 0 stars)
- ✅ Missing UserFinance records
- ✅ Negative balances
- ✅ Stale cron data
- ✅ Broken genealogy tree links
- ✅ Carry forward synchronization

---

## USAGE

### 1. AUDIT MODE (Read-Only - Start Here)
```bash
node scripts/database-sync.js --mode=audit
```
- **Safe**: No changes made to database
- **Output**: Comprehensive audit report in JSON
- **Purpose**: Identify all issues before fixing

### 2. DRY-RUN MODE (Simulation)
```bash
node scripts/database-sync.js --mode=dry-run
```
- **Safe**: Simulates fixes without saving
- **Output**: Shows what would be changed
- **Purpose**: Preview all changes before applying

### 3. FULL-FIX MODE (Production Fix)
```bash
node scripts/database-sync.js --mode=full-fix --backup
```
- **⚠️ CAUTION**: Makes actual changes to database
- **Backup**: Automatically creates MongoDB dump
- **Transaction**: All changes in single transaction (rollback on error)
- **Purpose**: Apply all fixes to production

### 4. SPECIFIC FIX MODE (Targeted)
```bash
# Fix only TDS issues
node scripts/database-sync.js --mode=specific --fix=tds

# Fix only rank issues
node scripts/database-sync.js --mode=specific --fix=ranks

# Available fixes: tds, ranks, bv, cron, tree, carry
```

---

## EXECUTION WORKFLOW (RECOMMENDED)

### Step 1: Run Audit
```bash
node scripts/database-sync.js --mode=audit
```
**Review the generated report:** `sync-report-2026-02-02.json`

### Step 2: Test with Dry-Run
```bash
node scripts/database-sync.js --mode=dry-run
```
**Verify:** Check console output for proposed changes

### Step 3: Create Backup & Fix
```bash
node scripts/database-sync.js --mode=full-fix --backup
```
**Monitor:** Watch for any errors during execution

### Step 4: Verify Fixes
```bash
# Run audit again to confirm all issues resolved
node scripts/database-sync.js --mode=audit

# Check your API
curl -X GET https://sarvasolution-backend.onrender.com/api/v1/user/wallet \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## WHAT GETS FIXED

### Phase 1: Audit (Always Runs)
- Counts total users, payouts, finance records
- Identifies all data integrity issues
- Calculates financial impact

### Phase 2: TDS & Admin Charge Correction
**Before:**
```json
{
  "grossAmount": 500,
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
  "netAmount": 465      ✅ (500 - 25 - 10)
}
```
**Overpayment Handling:**
- Calculates overpaid amount: ₹475 - ₹465 = ₹10
- Deducts from user's `availableBalance`
- Updates `totalEarnings` accordingly

### Phase 3: Rank Validation
**Example Fix:**
```
User: SVS000001
Current Rank: Gold (requires 100 star matches)
Actual Stars: 0
Action: Downgrade to Associate
```

### Phase 4: BV Recalculation
- Sums all `BVTransaction` records per leg
- Compares with stored `leftLegBV` / `rightLegBV`
- Updates discrepancies

### Phase 5: Cron State Reset
- Resets `dailyClosings` to 0 (if last reset was yesterday)
- Transfers `weeklyEarnings` to `availableBalance`
- Clears stale weekly earnings

### Phase 6: Genealogy Tree Validation
- Checks parent-child relationships
- Identifies orphaned users
- **Note:** Auto-fix disabled (requires manual review)

### Phase 7: Carry Forward Sync
- Recalculates `carryForwardLeft` / `carryForwardRight`
- Formula: `totalBV - matchedBV - pendingBV`
- Ensures no negative values

---

## SAFETY FEATURES

### Transaction Support
- All updates wrapped in MongoDB transaction
- Automatic rollback on any error
- Atomic operation (all-or-nothing)

### Backup Capability
```bash
--backup flag creates MongoDB dump in:
./backups/backup-2026-02-02T18-30-45/
```

### Idempotent Design
- Safe to run multiple times
- Checks before updating
- Only fixes what needs fixing

### Detailed Logging
```json
{
  "timestamp": "2026-02-02T18:30:00Z",
  "mode": "full-fix",
  "totalUsers": 150,
  "issues": {
    "wrongTDS": [/* details */],
    "invalidRanks": [/* details */]
  },
  "fixes": {
    "payoutsFixed": 25,
    "ranksFixed": 3
  },
  "financialImpact": {
    "totalTDSMissing": 250.00,
    "totalOverpayment": 250.00
  }
}
```

---

## OUTPUT FILES

### Audit Report (JSON)
**File:** `sync-report-2026-02-02.json`
- Complete audit data
- All identified issues
- Financial impact summary

### Console Output
- Real-time progress updates
- Phase-by-phase summary
- Success/error messages

---

## TROUBLESHOOTING

### Script Won't Connect to MongoDB
```bash
# Check your .env file
cat .env | grep MONGODB_URI

# Test connection
node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI)"
```

### Permission Denied
```bash
chmod +x scripts/database-sync.js
```

### Backup Fails
```bash
#Ensure mongodump is installed
mongodump --version

# Install if missing (Ubuntu/Debian)
sudo apt-get install mongodb-database-tools
```

### Transaction Not Supported
- Requires MongoDB 4.0+ with replica set
- For standalone MongoDB, script will still work but without transaction support
- Changes will be applied incrementally

---

## POST-FIX VERIFICATION

### Check Wallet API
```bash
curl -X GET https://sarvasolution-backend.onrender.com/api/v1/user/wallet \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Changes:**
- `tdsDeducted`: 0 → 10
- `netAmount`: 475 → 465
- `availableBalance`: 475 → 465

### Check Rank
```bash
curl -X GET https://sarvasolution-backend.onrender.com/api/v1/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** `currentRank` matches actual star count

---

## ROLLBACK (If Needed)

### Restore from Backup
```bash
# Find your backup
ls -la ./backups/

# Restore (⚠️ THIS WILL OVERWRITE CURRENT DATA)
mongorestore --uri="YOUR_MONGODB_URI" --drop ./backups/backup-TIMESTAMP/
```

---

## FREQUENTLY ASKED QUESTIONS

**Q: Is it safe to run on production?**
A: Yes, when using `--backup` flag. Always run audit and dry-run first.

**Q: Can I undo changes?**
A: Yes, restore from backup. Transaction support also enables automatic rollback on errors.

**Q: How long does it take?**
A: Depends on database size. ~1-2 minutes for 100-500 users.

**Q: Will it affect active users?**
A: Minimal impact. Uses read-mostly operations. Updates are fast and transactional.

**Q: Should I stop the server?**
A: Not required, but recommended for critical fixes to avoid race conditions.

---

## SUPPORT

For issues or questions:
1. Check `sync-report-*.json` for details
2. Review console output for errors
3. Restore from backup if needed
4. Contact dev team with log files
