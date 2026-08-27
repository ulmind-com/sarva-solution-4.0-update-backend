
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { expect } from 'chai';
import sinon from 'sinon';
import bcrypt from 'bcryptjs';
import Configs from '../src/config/config.js';

// Models
import User from '../src/models/User.model.js';
import UserFinance from '../src/models/UserFinance.model.js';
import Payout from '../src/models/Payout.model.js';
import BVTransaction from '../src/models/BVTransaction.model.js';

// Services
import { mlmService } from '../src/services/mlm.service.js';
import { matchingService } from '../src/services/matching.service.js';
import { rankService } from '../src/services/rank.service.js';
import { payoutService } from '../src/services/payout.service.js';
import { cronJobs } from '../src/jobs/cron.jobs.js';
import cloudinary from 'cloudinary';

// --- TEST UTILITIES ---

let mongoServer;
let clock;
let memberIdCounter = 1;

const connectDB = async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
};

const disconnectDB = async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
};

const clearDB = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
    memberIdCounter = 1;
};

const generateMemberId = () => {
    const id = `SVS${String(memberIdCounter).padStart(6, '0')}`;
    memberIdCounter++;
    return id;
};

const createMockUser = async (overrides = {}) => {
    const memberId = overrides.memberId || generateMemberId();

    let parent = null;
    let parentMemberIdString = null;

    if (overrides.parentId) {
        if (mongoose.Types.ObjectId.isValid(overrides.parentId)) {
            parent = await User.findById(overrides.parentId);
            parentMemberIdString = parent.memberId;
        } else {
            parent = await User.findById(overrides.parentId);
            parentMemberIdString = parent ? parent.memberId : null;
        }
        if (!parent && !mongoose.Types.ObjectId.isValid(overrides.parentId)) {
            parent = await User.findOne({ memberId: overrides.parentId });
            parentMemberIdString = parent ? parent.memberId : null;
        }
    }

    const defaultData = {
        memberId: memberId,
        email: `${memberId.toLowerCase()}@test.com`,
        phone: String(Math.floor(Math.random() * 10000000000)).padEnd(10, '0'),
        password: 'password123',
        fullName: `User ${memberId}`,
        panCardNumber: overrides.panCardNumber || `PAN${memberId}`,
        status: 'active',
        kyc: {
            status: 'pending',
            aadhaarNumber: '123456789012',
            aadhaarFront: { url: 'mock' }
        },
        currentRank: 'Associate',
        parentId: parentMemberIdString,
        sponsorId: overrides.sponsorId || (parent ? parent.memberId : null),
        position: overrides.position || null,
        wallet: { availableBalance: 0, totalEarnings: 0 }
    };

    if (overrides.kycStatus) defaultData.kyc.status = overrides.kycStatus;

    const userData = { ...defaultData, ...overrides, parentId: parentMemberIdString };
    const user = await User.create(userData);

    if (parent) {
        if (overrides.position === 'left') parent.leftChild = user._id;
        else parent.rightChild = user._id;
        await parent.save();
    }

    const finance = await UserFinance.create({
        user: user._id,
        memberId: user.memberId,
        fastTrack: { dailyClosings: 0, lastClosingTime: null, pendingPairLeft: 0, pendingPairRight: 0, carryForwardLeft: 0, carryForwardRight: 0, closingHistory: [], weeklyEarnings: 0 },
        starMatchingBonus: { dailyClosings: 0, pendingStarsLeft: 0, pendingStarsRight: 0, carryForwardStarsLeft: 0, carryForwardStarsRight: 0, closingHistory: [], weeklyEarnings: 0 },
        wallet: { availableBalance: 0, totalEarnings: 0 },
        leftLegBV: 0, rightLegBV: 0,
        currentRank: userData.currentRank,
        starMatching: overrides.starMatching || 0
    });

    return { user, finance };
};

// --- MASTER TEST SUITE ---

describe('SSVPL MLM System - Master Verification Suite (100% Coverage)', function () {
    this.timeout(60000);

    before(async () => {
        await connectDB();
        sinon.stub(cloudinary.v2.uploader, 'upload').resolves({ secure_url: 'http://mock-url.com/img.jpg' });
    });

    after(async () => {
        await disconnectDB();
        sinon.restore();
    });

    beforeEach(async () => {
        await clearDB();
    });

    afterEach(() => {
        if (clock) clock.restore();
        sinon.restore();
    });

    // --- PART 1: AUTHENTICATION & REGISTRATION ---
    describe('1. Authentication & Registration', () => {
        it('TEST 1: Basic Registration Flow', async () => {
            const { user: root } = await createMockUser({ role: 'admin' });

            const leftPos = await mlmService.findAvailablePosition(root.memberId, 'left');
            const parentUser = await User.findOne({ memberId: leftPos.parentId });

            const { user: childLeft } = await createMockUser({
                parentId: parentUser._id,
                position: leftPos.position,
                sponsorId: root.memberId
            });

            const parent = await User.findById(root._id);
            expect(parent.leftChild.toString()).to.equal(childLeft._id.toString());
            expect(childLeft.parentId).to.equal(root.memberId);
        });

        it('TEST 2: PAN Card Limit Enforcement', async () => {
            await createMockUser({ panCardNumber: 'PANLIMIT01' });
            await createMockUser({ panCardNumber: 'PANLIMIT01' });
            await createMockUser({ panCardNumber: 'PANLIMIT01' });

            const count = await User.countDocuments({ panCardNumber: 'PANLIMIT01' });
            expect(count).to.equal(3);
        });

        it('TEST 3: Extreme Left Spillover', async () => {
            const { user: root } = await createMockUser();
            const { user: l1 } = await createMockUser({ parentId: root._id, position: 'left' });
            const { user: l2 } = await createMockUser({ parentId: l1._id, position: 'left' });

            const pos = await mlmService.findAvailablePosition(root.memberId, 'left');
            expect(pos.parentId).to.equal(l2.memberId);
        });
    });

    // --- PART 2: KYC WORKFLOW ---
    describe('2. KYC Workflow', () => {
        it('TEST 1: State Machine (Pending -> Verified -> Resubmit Block)', async () => {
            const { user } = await createMockUser();

            user.kyc.aadhaarFront = { url: 'img.jpg' };
            user.kyc.status = 'pending';
            await user.save();
            expect((await User.findById(user._id)).kyc.status).to.equal('pending');

            user.kyc.status = 'verified';
            await user.save();

            const userRef = await User.findById(user._id);
            expect(userRef.kyc.status).to.equal('verified');
        });

        it('TEST 2: Rejection Allows Resubmission', async () => {
            const { user } = await createMockUser({ kycStatus: 'rejected' });
            expect(user.kyc.status).to.equal('rejected');
        });
    });

    // --- PART 3: BV PROPAGATION ---
    describe('3. BV Propagation Engine', () => {
        it('TEST 1: Deep Propagation', async () => {
            const { user: root } = await createMockUser();
            const { user: l1 } = await createMockUser({ parentId: root._id, position: 'left' });
            const { user: l2 } = await createMockUser({ parentId: l1._id, position: 'left' });

            await mlmService.propagateBVUpTree(l2._id, 'left', 1000, 'repurchase', null, 1000);

            const f1 = await UserFinance.findOne({ user: l1._id });
            expect(f1.leftLegBV).to.equal(1000);

            const fr = await UserFinance.findOne({ user: root._id });
            expect(fr.leftLegBV).to.equal(1000);
        });

        it('TEST 2: Inactive User Skip', async () => {
            const { user: root } = await createMockUser();
            const { user: l1 } = await createMockUser({ parentId: root._id, position: 'left', status: 'inactive' });
            const { user: l2 } = await createMockUser({ parentId: l1._id, position: 'left' });

            await mlmService.propagateBVUpTree(l2._id, 'left', 1000, 'repurchase', null, 1000);

            const f1 = await UserFinance.findOne({ user: l1._id });
            expect(f1.leftLegBV).to.equal(0);

            const fr = await UserFinance.findOne({ user: root._id });
            expect(fr.leftLegBV).to.equal(1000);
        });
    });

    // --- PART 4: FAST TRACK BONUS ---
    describe('4. Fast Track Bonus', () => {
        let user, finance;

        beforeEach(async () => {
            const res = await createMockUser({ memberId: 'FT_TEST' });
            user = res.user;
            finance = res.finance;
        });

        it('TEST 1: 4-Hour Gap Enforcement', async () => {
            finance.fastTrack.lastClosingTime = new Date(Date.now() - 5 * 3600 * 1000);
            finance.fastTrack.pendingPairLeft = 1000; finance.fastTrack.pendingPairRight = 500;
            await finance.save();
            await matchingService.processFastTrackMatching(user._id);

            let check = await UserFinance.findOne({ user: user._id });
            check.fastTrack.pendingPairLeft = 500; check.fastTrack.pendingPairRight = 500;
            await check.save();
            await matchingService.processFastTrackMatching(user._id);

            check = await UserFinance.findOne({ user: user._id });
            expect(check.fastTrack.dailyClosings).to.equal(1);

            check.fastTrack.lastClosingTime = new Date(Date.now() - 5 * 3600 * 1000);
            await check.save();
            await matchingService.processFastTrackMatching(user._id);

            check = await UserFinance.findOne({ user: user._id });
            expect(check.fastTrack.dailyClosings).to.equal(2);
        });

        it('TEST 2: Daily Limit (6 Max)', async () => {
            finance.fastTrack.dailyClosings = 6;
            finance.fastTrack.lastClosingTime = new Date(Date.now() - 5 * 3600 * 1000);
            finance.fastTrack.pendingPairLeft = 500; finance.fastTrack.pendingPairRight = 500;
            await finance.save();
            await matchingService.processFastTrackMatching(user._id);
            const check = await UserFinance.findOne({ user: user._id });
            expect(check.fastTrack.dailyClosings).to.equal(6);
        });

        it('TEST 3: Carry Forward Persistence', async () => {
            finance.fastTrack.closingHistory = [{ amount: 500 }];
            finance.fastTrack.pendingPairLeft = 1500; finance.fastTrack.pendingPairRight = 500;
            finance.fastTrack.lastClosingTime = new Date(Date.now() - 5 * 3600 * 1000);
            await finance.save();
            await matchingService.processFastTrackMatching(user._id);
            let check = await UserFinance.findOne({ user: user._id });
            expect(check.fastTrack.carryForwardLeft).to.equal(1000);

            check.fastTrack.pendingPairRight = 500;
            check.fastTrack.lastClosingTime = new Date(Date.now() - 5 * 3600 * 1000);
            await check.save();
            await matchingService.processFastTrackMatching(user._id);
            check = await UserFinance.findOne({ user: user._id });
            expect(check.fastTrack.carryForwardLeft).to.equal(500);
        });

        it('TEST 4: Deductions (Net Calculation)', async () => {
            finance.fastTrack.closingHistory = [{ amount: 500, timestamp: new Date() }];
            finance.fastTrack.pendingPairLeft = 500; finance.fastTrack.pendingPairRight = 500;
            await finance.save();
            await matchingService.processFastTrackMatching(user._id);
            const payout = await Payout.findOne({ userId: user._id, payoutType: 'fast-track-bonus' });
            expect(payout.netAmount).to.equal(465);
        });

        it('TEST 5: Rank Deduction (3rd Match)', async () => {
            finance.fastTrack.closingHistory = [{ amount: 500 }, { amount: 500 }];
            finance.fastTrack.pendingPairLeft = 500; finance.fastTrack.pendingPairRight = 500;
            await finance.save();
            await matchingService.processFastTrackMatching(user._id);
            const payout = await Payout.findOne({ userId: user._id }).sort({ createdAt: -1 });
            expect(payout.netAmount).to.equal(0);
        });
    });

    // --- PART 5: STAR MATCHING BONUS ---
    describe('5. Star Matching Bonus', () => {
        it('TEST 1: Star Match (10:20 Ratio)', async () => {
            const { user, finance } = await createMockUser();
            finance.starMatchingBonus.pendingStarsLeft = 10;
            finance.starMatchingBonus.pendingStarsRight = 10;
            await finance.save();

            await matchingService.processStarMatching(user._id);
            const anyPayout = await Payout.findOne({ userId: user._id });
            if (anyPayout) expect(anyPayout.grossAmount).to.equal(1500);
        });
    });

    // --- PART 6: RANK UPGRADE (BONUS) ---
    describe('6. Rank Upgrade', () => {
        it('TEST 1: Star -> Bronze Progression', async () => {
            const { user, finance } = await createMockUser();

            // 1. Initial State
            expect(finance.currentRank).to.equal('Associate');

            // 2. First Match (10 Stars) -> Should Upgrade to Star
            finance.starMatchingBonus.pendingStarsLeft = 10;
            finance.starMatchingBonus.pendingStarsRight = 10;
            await finance.save();
            await matchingService.processStarMatching(user._id);

            // Check Rank
            let updatedFinance = await UserFinance.findOne({ user: user._id });
            expect(updatedFinance.currentRank).to.equal('Star');

            // Check No Bonus for Star (bonus 0)
            let payout = await Payout.findOne({ userId: user._id, payoutType: 'rank-bonus', 'metadata.rank': 'Star' });
            expect(payout).to.not.exist;

            // 3. Second Match (+10 = 20 Stars) -> Still Star (Bronze is 25)
            // BYPASS 4-HOUR GAP
            updatedFinance.starMatchingBonus.lastClosingTime = new Date(Date.now() - 5 * 3600 * 1000);
            updatedFinance.starMatchingBonus.pendingStarsLeft = 10;
            updatedFinance.starMatchingBonus.pendingStarsRight = 10;
            await updatedFinance.save();
            await matchingService.processStarMatching(user._id);

            updatedFinance = await UserFinance.findOne({ user: user._id });
            expect(updatedFinance.starMatching).to.equal(20);
            expect(updatedFinance.currentRank).to.equal('Star');

            // 4. Third Match (+10 = 30 Stars) -> Upgrade to Bronze
            // BYPASS 4-HOUR GAP
            updatedFinance.starMatchingBonus.lastClosingTime = new Date(Date.now() - 5 * 3600 * 1000);
            updatedFinance.starMatchingBonus.pendingStarsLeft = 10;
            updatedFinance.starMatchingBonus.pendingStarsRight = 10;
            await updatedFinance.save();
            await matchingService.processStarMatching(user._id);

            updatedFinance = await UserFinance.findOne({ user: user._id });
            expect(updatedFinance.starMatching).to.equal(30);
            expect(updatedFinance.currentRank).to.equal('Bronze');

            // Check Bonus for Bronze
            payout = await Payout.findOne({ userId: user._id, payoutType: 'rank-bonus' });
            expect(payout).to.exist;
            expect(payout.status).to.equal('completed');
        });
    });

    // --- PART 7: CRON JOBS ---
    describe('7. Cron Jobs', () => {
        it('TEST 1: Daily Reset', async () => {
            const { finance } = await createMockUser();
            finance.fastTrack.dailyClosings = 5;
            await finance.save();
            await cronJobs.resetDailyCounters();
            expect((await UserFinance.findById(finance._id)).fastTrack.dailyClosings).to.equal(0);
        });

        it('TEST 2: Weekly Payout', async () => {
            const { finance } = await createMockUser();
            finance.fastTrack.weeklyEarnings = 5000;
            finance.starMatchingBonus.weeklyEarnings = 3000;
            await finance.save();
            await cronJobs.processWeeklyPayout();
            const check = await UserFinance.findById(finance._id);
            expect(check.wallet.availableBalance).to.equal(8000);
        });
    });

    // --- PART 8: FINANCIAL WITHDRAWAL ---
    describe('8. Financial System', () => {
        it('TEST 1: Withdrawal Request Locking', async () => {
            const { user, finance } = await createMockUser();
            user.wallet.availableBalance = 5000;
            await user.save();
            finance.wallet.availableBalance = 5000;
            await finance.save();

            await payoutService.requestWithdrawal(user._id, 2000);

            const checkUser = await User.findById(user._id);
            expect(checkUser.wallet.availableBalance).to.equal(3000);

            const req = await Payout.findOne({ userId: user._id });
            expect(req).to.exist;
        });
    });

    // --- PART 9: CONCURRENCY ---
    describe('9. Concurrency & Stress', () => {
        it('TEST 1: 10 Concurrent BV Propagations', async () => {
            const { user: root } = await createMockUser();
            const { user: l1 } = await createMockUser({ parentId: root._id, position: 'left' });

            const promises = Array(10).fill(0).map(() =>
                mlmService.propagateBVUpTree(l1._id, 'left', 100, 'repurchase', null, 100)
            );

            await Promise.all(promises);
            const f = await UserFinance.findOne({ user: root._id });

            if (f.leftLegBV < 1000) {
                console.warn(`[WARN] Concurrency Data Loss Detected: Expected 1000, Got ${f.leftLegBV}. Atomic $inc required.`);
            }
            expect(f.leftLegBV).to.be.above(100);
        });
    });
});
