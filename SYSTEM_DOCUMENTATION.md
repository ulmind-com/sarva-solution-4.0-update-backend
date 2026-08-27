# SarvaSolution Backend System Documentation

**Date:** February 10, 2026
**Version:** 1.1 (Production Logic Verified)
**Status:** Live & Normalized

---

## 1. Executive Summary
This document provides a comprehensive technical and logical overview of the **SarvaSolution Backend System**. It details every workflow, algorithm, and automated process currently live in the system, ensuring complete transparency for the client.

The system is a high-performance **Binary MLM Engine** built on **Node.js/Express** and **MongoDB**. It features automated financial processing, real-time commission tracking, and a robust franchise management module.

---

## 2. Automated Financial Logic (The "Friday Payout")

### 2.1. Automatic Payout Generation
**File:** `src/jobs/cron.jobs.js`
**Schedule:** Every **Friday at 12:00 AM (Midnight IST)**.

The system automatically scans the entire user base to generate payouts without manual intervention.
**Logic Flow:**
1.  **Scan:** The system finds all users with a `wallet.availableBalance` greater than **₹100**.
2.  **KYC Check:** It strictly filters for users whose KYC status is **'verified'**. Users with 'pending' or 'rejected' KYC are skipped to ensure compliance.
3.  **Minimum Withdrawal Check:** Even if balance > 100, it validates against the user's specific `minimumWithdrawal` setting (Default: **₹450**).
4.  **Deductions:**
    *   **Admin Charge:** 5% of the total amount.
    *   **TDS:** 2% of the total amount.
    *   **Net Calculation:** `Gross - Admin - TDS = Net Amount`.
5.  **Execution:**
    *   A `Payout` record is created with status **'pending'**.
    *   The `availableBalance` is debited immediately.
    *   The amount is moved to `pendingWithdrawal` for banking processing.

### 2.2. Weekly Payout Aggregation
**File:** `src/jobs/cron.jobs.js`
**Schedule:** Every **Monday at 12:00 AM**.
*   **Purpose:** Resets weekly earning counters (`fastTrack.weeklyEarnings`, `starMatchingBonus.weeklyEarnings`) for statistical reporting. Actual funds are credited instantly during the week (see Section 3.1), so this job handles data cleanup for the new week.

---

## 3. Core Business Logic & Algorithms

### 3.1. Binary MLM Algorithm (Real-Time)
**Files:** `src/services/business/matching.service.js`, `mlm.service.js`
**Trigger:** Runs every **4 Hours** via Cron (Frequency: 6 times/day).

#### A. Fast Track Bonus (The "Pair Match")
*   **Logic:**
    *   **First Pair:** 2:1 or 1:2 Ratio (1000 PV : 500 PV).
    *   **Subsequent Pairs:** 1:1 Ratio (500 PV : 500 PV).
*   **Payout:** ₹500 per Pair.
*   **Qualification:** User *must* have **1 Active Direct (Left)** and **1 Active Direct (Right)**.
*   **Capping:** Max **6 Closings/Day**.
*   **Deductions & Rank Contribution:**
    *   The **3rd, 6th, 9th, and 12th** pairs are **100% deducted**.
    *   These deductions contribute to the **"Star Rank"** upgrade.
    *   On the **12th Deduction**, the user automatically becomes **IsStar = True**.

#### B. Star Matching Bonus
*   **Logic:** Matches "Star" users in the downline.
*   **Eligibility:** Only for users who are already "Star".
*   **Payout:** ₹1,500 per Star Match.
*   **Capping:** ₹1,500 per closing cycle.

### 3.2. Rank Advancement ("Next Basis")
**File:** `src/services/business/rank.service.js`
*   **Logic:** Rank promotion is based on **Fresh Business** only.
*   **Mechanism:**
    *   When a user hits a rank (e.g., Bronze), their `currentRankMatchCount` resets to **0**.
    *   They must achieve the *full* requirement for Silver (30 Matches) starting from zero. Previous volume does not carry over for rank calculation.
*   **Tiers:** Associate -> Star -> Bronze ... -> SSVPL Legend.

---

## 4. Franchise & Inventory Workflow

### 4.1. Franchise Creation
**File:** `src/controllers/admin/franchise.controller.js`
*   **Admin Action:** Admin creates a Franchise.
*   **System Action:**
    *   Generates a unique **Vendor ID**.
    *   Hashes password securely.
    *   Sends a **Welcome Email** with credentials.

### 4.2. Stock Requests
**File:** `src/controllers/franchise/request.controller.js`
*   **Franchise Action:** Selects products from Admin Inventory and requests quantity.
*   **Logic:**
    *   Validates Admin Stock > 0.
    *   Calculates Estimated Total.
    *   Creates a `ProductRequest` with status **'pending'**.
*   **Admin Action:** Approves/Rejects request.
*   **Result:** Upon approval, stock moves from Admin Inventory -> Franchise Inventory.

### 4.3. Point of Sale (POS)
**File:** `src/controllers/franchise/sale.controller.js`
*   **Action:** Franchise sells product to User.
*   **Logic:**
    *   Deducts stock from Franchise Inventory.
    *   **Credits BV/PV** to the User.
    *   **Activates User:** If it's a "Joining Package", user status becomes **'active'**.
    *   **Triggers MLM:** Calls `mlmService` to update Sponsor counts and propagate volume up the tree.

---

## 5. User & Admin Modules

### 5.1. KYC System
**File:** `src/controllers/user/kyc.controller.js`
*   **User Action:** Uploads Aadhaar (Front/Back) and PAN Card.
*   **Logic:**
    *   Enforces strict "One-Time Submission" rule.
    *   Uploads images securely to **Cloudinary**.
    *   Sets status to **'pending'**.
*   **Admin Action:** Reviews documents and clicks "Verify".
    *   Only *verified* users can receive Payouts.

### 5.2. Admin Management
*   **Franchise Control:** Admin can Block/Unblock franchises (e.g., for non-payment).
*   **Product Management:** Add/Edit/Disable products. Changes reflect instantly for Franchises.

---

## 6. Technical Architecture & Scalability

### 6.1. Database Normalization (Phase 4 Verified)
We have optimized the MongoDB schema for massive scale:
*   **Removed Unbounded Arrays:** The `directSponsors.members` array was removed. Use `User.find({ sponsorId: '...' })` instead. This prevents document crashes for leaders with 10,000+ teams.
*   **Lightweight Finance Records:** History logs are now handled via indexed `Payout` queries instead of embedding thousands of objects inside the User document.

### 6.2. Security
*   **JWT:** Stateless authentication for all API routes.
*   **Bcrypt:** Industry-standard password hashing.
*   **Validation:** Input sanitization on all Controller levels.

---

## 7. Conclusion
The SarvaSolution system is a complete, production-grade MLM platform. It automates the entire lifecycle:
1.  **Join:** Registration & Placement.
2.  **Activate:** Franchise Sale & Stock Management.
3.  **Earn:** Real-time Binary Matching & Rank Logic.
4.  **Withdraw:** Automated Friday Payouts & KYC Compliance.

Every logic point requested has been implemented, tested, and verified in the codebase.
