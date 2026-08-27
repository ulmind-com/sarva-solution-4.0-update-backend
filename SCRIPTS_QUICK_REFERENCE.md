# Database Synchronization & Reset Scripts - Quick Reference

## 🎯 TWO SCRIPTS AVAILABLE

### 1. **database-sync.js** - Audit & Fix (Non-Destructive)
**Purpose**: Audit and fix data integrity issues without resetting user progress

```bash
# Read-only audit
node scripts/database-sync.js --mode=audit

# Preview fixes
node scripts/database-sync.js --mode=dry-run

# Apply all fixes
node scripts/database-sync.js --mode=full-fix --backup
```

**What it does**:
- ✅ Audits and reports all issues
- ✅ Fixes TDS deductions (₹10 on ₹500)
- ✅ Corrects rank inconsistencies (Gold → Associate if insufficient stars)
- ✅ Creates missing UserFinance records
- ✅ Validates BV calculations
- ✅ Resets stale cron data
- ❌ Does NOT reset user ranks wholesale
- ❌ Does NOT clear closing histories

### 2. **reset-database.js** - Full Reset (Destructive Normalization)
**Purpose**: Complete database normalization - resets all users to starting state

```bash
# Preview reset
node scripts/reset-database.js --dry-run

# Fix TDS only (no reset)
node scripts/reset-database.js --backup

# FULL RESET (⚠️ Resets everything!)
node scripts/reset-database.js --full-reset
```

**What it does**:
- ✅ Fixes TDS deductions
- ✅ Creates missing UserFinance records
- ✅ **Resets ALL users to Associate rank**
- ✅ **Clears all closing histories**
- ✅ **Removes illegitimate earnings**
- ✅ Validates genealogy tree
- ⚠️ **DESTRUCTIVE**: Use for initial normalization only

---

## 🚦 DECISION FLOWCHART

```
Do you want to KEEP existing user progress (ranks, closings, etc.)?

├─ YES → Use: database-sync.js --mode=full-fix
│         Fixes errors while preserving legitimate progress
│
└─ NO  → Use: reset-database.js --full-reset  
          Complete fresh start, all users back to Associate
```

---

## 📊 COMPARISON

| Feature | database-sync.js | reset-database.js (full-reset) |
|---------|------------------|-------------------------------|
| Fix TDS errors | ✅ Yes | ✅ Yes |
| Create missing finance | ✅ Yes | ✅ Yes |
| Reset to Associate | ❌ Only if invalid | ✅ ALL users |
| Clear closing history | ❌ No | ✅ Yes |
| Remove earnings | ❌ Only overpayments | ✅ All illegitimate |
| Preserve progress | ✅ Yes | ❌ No |
| Use case | Production fixes | Initial normalization |

---

## 🎯 RECOMMENDED USAGE

### For Production (User Data Exists):
```bash
# 1. Audit first
node scripts/database-sync.js --mode=audit

# 2. Preview fixes
node scripts/database-sync.js --mode=dry-run

# 3. Apply fixes
node scripts/database-sync.js --mode=full-fix --backup
```

### For Fresh Start (Reset Everything):
```bash
# 1. Preview
node scripts/reset-database.js --dry-run

# 2. Full reset
node scripts/reset-database.js --full-reset
```

### For TDS Fix Only:
```bash
# Either script works:
node scripts/database-sync.js --mode=specific --fix=tds
# OR
node scripts/reset-database.js --backup
```

---

## 📁 FILES CREATED

```
scripts/
├── database-sync.js          # Audit & fix (650+ lines)
├── reset-database.js         # Full reset (550+ lines)
├── sync_production.js        # Simple production sync
└── fix_payout_tds.js         # TDS-only fix

Documentation:
├── DATABASE_SYNC_GUIDE.md    # Full guide for database-sync.js
├── DATABASE_RESET_GUIDE.md   # Full guide for reset-database.js
└── PRODUCTION_SYNC_GUIDE.md  # Quick reference

Admin API:
└── src/controllers/admin/fixDatabase.controller.js
    POST /api/v1/admin/fix-database (one-time fix endpoint)
```

---

## ⚡ QUICK FIXES

### Fix TDS on Production Right Now:
```bash
# Option 1: Via API (if backend is deployed)
POST https://your-api.com/api/v1/admin/fix-database

# Option 2: Via script
node scripts/reset-database.js --backup
```

### Check What's Wrong:
```bash
node scripts/database-sync.js --mode=audit
# Read: sync-report-2026-02-02.json
```

### Full System Reset (⚠️ Destructive):
```bash
node scripts/reset-database.js --full-reset
```

---

## 🔒 SAFETY

Both scripts include:
- ✅ MongoDB transaction support (rollback on error)
- ✅ Automatic backup creation
- ✅ Dry-run mode
- ✅ Detailed JSON audit trails
- ✅ Idempotent (safe to run multiple times)

---

## 📞 SUPPORT

**Issue**: "TDS still showing 0"
**Solution**: Run on production database, not local

**Issue**: "Want to reset everything"
**Solution**: `reset-database.js --full-reset`

**Issue**: "Want to fix errors only"
**Solution**: `database-sync.js --mode=full-fix`

**Issue**: "Can't connect to MongoDB"
**Solution**: Check `.env` file for `MONGODB_URI`
