const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

// Explicit opt-in only: use a disposable, migrated database, never the app's DATABASE_URL.
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL must point to a disposable migrated test database');
const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
function stub(path, value) {
  const id = require.resolve(path);
  require.cache[id] = { id, filename: id, loaded: true, exports: { __esModule: true, default: value } };
}
stub('../dist/config/database', db);
stub('../dist/utils/logger', { info() {}, warn() {}, error() {}, debug() {} });
stub('../dist/services/email.service', { async sendNGOApproved() {}, async sendNGOApplicationReceived() {} });
const { NGOService } = require('../dist/services/ngo.service');
const service = new NGOService();
after(() => db.$disconnect());

test('registration, approval, public visibility, re-review, stale approval and transactional rollback', async () => {
  const suffix = randomUUID();
  const owner = await db.user.create({ data: {
    email: `owner-${suffix}@example.org`, firstName: 'Test', lastName: 'Owner',
    firebaseUid: `owner-${suffix}`, role: 'NGO',
  } });
  const reviewer = await db.user.create({ data: {
    email: `reviewer-${suffix}@example.org`, firstName: 'Test', lastName: 'Reviewer',
    firebaseUid: `reviewer-${suffix}`, role: 'ADMIN', canApproveNgos: true,
  } });
  let ngoId;
  try {
    const application = {
      name: `Test community group ${suffix}`, email: `group-${suffix}@example.org`,
      phone: '2045550100', description: 'Test food receiving organisation', category: 'COMMUNITY',
      orgType: 'COMMUNITY_GROUP', primaryContactName: 'Test Owner', primaryContactTitle: 'Coordinator',
      address: '123 Test Street', postalCode: 'R3C 0A1',
      foodDonationDetails: '123 Test Street, weekdays 9–5, sealed dry food only, dry storage, owner receives deliveries.',
    };
    const registered = await service.registerNGO(application, owner.id);
    ngoId = registered.id;
    assert.equal(registered.status, 'PENDING');
    assert.equal(registered.primaryContactName, application.primaryContactName);
    assert.equal(registered.orgType, 'COMMUNITY_GROUP');
    await assert.rejects(service.getNGO(ngoId), { statusCode: 404 });
    const makeReview = async () => ({
      organisationChecked: true, representativeConfirmed: true, foodOperationsConfirmed: true,
      evidenceSources: 'Independent community centre listing checked and matched.',
      contactMethod: 'Called independently sourced centre number; director confirmed representative.',
      contactedAt: '2026-01-01', notes: 'Organisation, authority and dry food receiving arrangements confirmed.',
      applicationUpdatedAt: (await db.nGO.findUniqueOrThrow({ where: { id: ngoId } })).updatedAt.toISOString(),
    });
    await service.approveNGO(ngoId, reviewer.id, await makeReview());
    const evidence = await db.nGOReview.findFirstOrThrow({ where: { ngoId } });
    assert.equal(evidence.reviewerId, reviewer.id);
    assert.equal(evidence.applicationSnapshot.primaryContactName, application.primaryContactName);
    const publicProfile = await service.getNGO(ngoId);
    const dashboard = await service.getNGODashboard(ngoId);
    assert.equal(publicProfile.reviews, undefined);
    assert.equal(dashboard.ngo.reviews, undefined);
    const adminResults = await service.adminGetAllNGOs(undefined, undefined, 'APPROVED', suffix);
    assert.equal(adminResults.items[0].reviews[0].notes, evidence.notes);
    await service.updateNGO(ngoId, { primaryContactName: 'New representative' }, owner.id);
    assert.equal((await db.nGO.findUniqueOrThrow({ where: { id: ngoId } })).status, 'PENDING');
    await assert.rejects(service.getNGO(ngoId), { statusCode: 404 });
    assert.equal(await db.nGOReview.count({ where: { ngoId } }), 1);

    const stale = await makeReview();
    await db.nGO.update({ where: { id: ngoId }, data: { updatedAt: new Date(Date.now() + 1000) } });
    await assert.rejects(service.approveNGO(ngoId, reviewer.id, stale), { statusCode: 409 });

    // Force evidence storage to fail after the status update. The approval must roll back.
    await db.$executeRawUnsafe(`CREATE FUNCTION test_reject_review() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test evidence failure'; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER test_reject_review BEFORE INSERT ON ngo_reviews FOR EACH ROW EXECUTE FUNCTION test_reject_review()`);
    try {
      await assert.rejects(service.approveNGO(ngoId, reviewer.id, await makeReview()), /test evidence failure/);
      assert.equal((await db.nGO.findUniqueOrThrow({ where: { id: ngoId } })).status, 'PENDING');
      assert.equal(await db.nGOReview.count({ where: { ngoId } }), 1);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER test_reject_review ON ngo_reviews');
      await db.$executeRawUnsafe('DROP FUNCTION test_reject_review()');
    }
  } finally {
    if (ngoId) {
      await db.nGOReview.deleteMany({ where: { ngoId } });
      await db.nGOMember.deleteMany({ where: { ngoId } });
      await db.nGO.delete({ where: { id: ngoId } });
    }
    await db.user.deleteMany({ where: { id: { in: [owner.id, reviewer.id] } } });
  }
});
