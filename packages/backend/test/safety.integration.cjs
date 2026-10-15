const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL must point to a disposable migrated database');
const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
function stub(path, exports) { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports: { __esModule: true, ...exports } }; }
stub('../dist/config/database', { default: db });
stub('../dist/utils/logger', { default: { info() {}, warn() {}, error() {}, debug() {} } });
stub('../dist/services/email.service', { default: {} });
const { SafetyService, validateReport } = require('../dist/services/safety.service');
const { NGOService } = require('../dist/services/ngo.service');
const { UpdateService } = require('../dist/services/update.service');
const { FoodNeedService } = require('../dist/services/foodNeed.service');
const { FoodPledgeService } = require('../dist/services/foodPledge.service');
const safety = new SafetyService(), ngos = new NGOService(), updates = new UpdateService(), needs = new FoodNeedService();
after(() => db.$disconnect());

test('validates safety submissions without trusting target identities or unlimited text', () => {
  for (const input of [{}, { targetType: 'USER', targetId: randomUUID(), reason: 'OTHER', details: 'Test concern' },
    { targetType: 'NGO', targetId: randomUUID(), reason: 'OTHER', details: 'a'.repeat(1001) }]) {
    assert.throws(() => validateReport(input), error => error.statusCode === 400);
  }
});

test('reports, permissions, persistent blocks, publication review, removal and deletion work against real foreign keys', async () => {
  const suffix = randomUUID();
  const people = [];
  const user = async role => { const result = await db.user.create({ data: { role, firstName: 'Safety', lastName: 'Test', email: `${randomUUID()}@example.org`, firebaseUid: randomUUID() } }); people.push(result); return result; };
  const donor = await user('DONOR'), other = await user('DONOR'), owner = await user('NGO'), owner2 = await user('NGO'), admin = await user('SUPER_ADMIN');
  const makeNgo = (manager, n) => db.nGO.create({ data: { name: `Safety ${suffix} ${n}`, slug: `safety-${suffix}-${n}`, managerId: manager.id, description: 'Safe community food distribution', email: `${n}-${suffix}@example.org`, category: 'FOOD_BANK', address: 'Test street', postalCode: 'R3C 0A1', status: 'APPROVED' } });
  const ngo = await makeNgo(owner, 1), ngo2 = await makeNgo(owner2, 2);
  const actor = { id: admin.id, role: 'SUPER_ADMIN', canApproveNgos: true };
  let server;
  try {
    await db.nGOMember.create({ data: { userId: owner.id, invitedById: owner.id, ngoId: ngo.id, role: 'MANAGER', canPostNeeds: true, canPostUpdates: true, status: 'ACTIVE' } });
    const makeNeed = (org, author, moderationStatus = 'APPROVED') => db.foodNeed.create({ data: { title: `Rice ${suffix}`, itemName: 'Rice', itemCategory: 'GRAINS', unit: 'bags', quantityRequired: 10, ngoId: org.id, postedById: author.id, moderationStatus } });
    const need = await makeNeed(ngo, owner), need2 = await makeNeed(ngo2, owner2);
    const update = await db.update.create({ data: { ngoId: ngo.id, postedById: owner.id, title: `Update ${suffix}`, body: 'Food distribution update for the community.', type: 'ANNOUNCEMENT', status: 'PUBLISHED', moderationStatus: 'APPROVED' } });
    const input = { targetType: 'UPDATE', targetId: update.id, reason: 'OTHER', details: 'Please investigate this update.', ngoId: ngo2.id };
    const reports = await Promise.all([safety.report(donor.id, input), safety.report(donor.id, input)]);
    assert.equal(reports[0].id, reports[1].id);
    const saved = await db.safetyReport.findUniqueOrThrow({ where: { id: reports[0].id } });
    assert.equal(saved.ngoId, ngo.id); // derives publisher from target, ignores spoofed body ngoId
    assert.equal(saved.snapshot.body, update.body);
    assert.equal(await db.safetyReport.count({ where: { reporterId: donor.id } }), 1);

    await Promise.all([safety.block(donor.id, ngo.id), safety.block(donor.id, ngo.id)]);
    assert.equal((await new SafetyService().blocks(donor.id)).length, 1);
    const listed = await ngos.getAllNGOs({ search: suffix }, donor.id);
    assert.deepEqual(listed.items.map(x => x.id), [ngo2.id]);
    assert.equal((await ngos.getAllNGOs({ search: suffix }, other.id)).items.length, 2);
    assert.equal((await updates.getPublishedUpdates('1', '20', undefined, ngo.id, undefined, donor.id)).items.length, 0);
    assert.equal((await needs.getAllFoodNeeds('1', '20', undefined, ngo.id, undefined, undefined, donor.id)).items.length, 0);
    for (const call of [() => ngos.getNGO(ngo.slug, donor.id), () => updates.getUpdateById(update.id, donor.id), () => needs.getFoodNeedById(need.id, donor.id),
      () => new FoodPledgeService().createFoodPledge({ foodNeedId: need.id, quantityPledged: 1 }, donor.id)]) {
      await assert.rejects(call, error => error.statusCode === 404);
    }
    await safety.unblock(other.id, ngo.id); // cannot remove another donor's block
    assert.equal((await safety.blocks(donor.id)).length, 1);
    await safety.unblock(donor.id, ngo.id);
    assert.equal((await ngos.getAllNGOs({ search: suffix }, donor.id)).items.length, 2);

    const pending = await makeNeed(ngo, owner, 'PENDING');
    await assert.rejects(() => needs.getFoodNeedById(pending.id), error => error.statusCode === 404);
    await assert.rejects(() => safety.report(donor.id, { ...input, targetType: 'FOOD_NEED', targetId: pending.id }), error => error.statusCode === 404);
    const oldVersion = pending.updatedAt.toISOString();
    const edited = await db.foodNeed.update({ where: { id: pending.id }, data: { title: 'Changed content', updatedAt: new Date(pending.updatedAt.getTime() + 1000) } });
    await assert.rejects(() => safety.reviewPending('FOOD_NEED', pending.id, admin.id, 'APPROVE', oldVersion, 'Reviewed text'), error => error.statusCode === 409);
    await safety.reviewPending('FOOD_NEED', pending.id, admin.id, 'APPROVE', edited.updatedAt.toISOString(), 'Reviewed text and arrangements');
    assert.equal((await needs.getFoodNeedById(pending.id)).id, pending.id);
    await needs.updateFoodNeed(pending.id, { description: 'New content that needs another review' }, owner.id);
    await assert.rejects(() => needs.getFoodNeedById(pending.id), error => error.statusCode === 404);

    const draft = await db.update.create({ data: { ngoId: ngo.id, postedById: owner.id, title: 'Draft for review', body: 'A new update awaiting moderator approval.', type: 'ANNOUNCEMENT' } });
    await updates.publishUpdate(draft.id, owner.id);
    await assert.rejects(() => updates.getUpdateById(draft.id), error => error.statusCode === 404);
    const submitted = (await safety.pending()).find(item => item.id === draft.id);
    await safety.reviewPending('UPDATE', draft.id, admin.id, 'REJECT', submitted.updatedAt.toISOString(), 'Needs a clearer description');
    assert.equal((await db.update.findUniqueOrThrow({ where: { id: draft.id } })).status, 'DRAFT');
    await updates.updateContent(draft.id, { body: 'Corrected update for the community.' }, owner.id);
    await updates.publishUpdate(draft.id, owner.id);
    const corrected = (await safety.pending()).find(item => item.id === draft.id);
    await safety.reviewPending('UPDATE', draft.id, admin.id, 'APPROVE', corrected.updatedAt.toISOString(), 'Corrected text reviewed');
    assert.equal((await updates.getUpdateById(draft.id)).id, draft.id);

    const needReport = await safety.report(donor.id, { ...input, targetType: 'FOOD_NEED', targetId: need.id });
    await safety.review(needReport.id, actor, 'REMOVE_CONTENT', 'Unsafe content removed');
    await assert.rejects(() => needs.getFoodNeedById(need.id), error => error.statusCode === 404);
    assert.equal((await db.foodNeed.findUniqueOrThrow({ where: { id: need.id } })).isSafetyHidden, true);
    const orgReport = await safety.report(donor.id, { ...input, targetType: 'NGO', targetId: ngo.id });
    await assert.rejects(() => safety.review(orgReport.id, { ...actor, role: 'ADMIN', canApproveNgos: false }, 'REMOVE_CONTENT', 'Suspend reported source'), error => error.statusCode === 403);
    assert.equal((await db.safetyReport.findUniqueOrThrow({ where: { id: orgReport.id } })).status, 'OPEN');
    const reviews = await Promise.allSettled([
      safety.review(reports[0].id, actor, 'REMOVE_CONTENT', 'Offensive update removed'),
      safety.review(reports[0].id, actor, 'DISMISS', 'No violation found'),
    ]);
    assert.equal(reviews.filter(x => x.status === 'fulfilled').length, 1);
    assert.equal(reviews.filter(x => x.status === 'rejected' && x.reason.statusCode === 409).length, 1);

    // HTTP checks exercise authentication and content-moderator authorisation.
    stub('../dist/middleware/auth', { authenticate(req, _res, next) {
      const token = req.headers.authorization;
      if (!token) { const err = new Error('Authentication required'); err.statusCode = 401; return next(err); }
      const current = token === 'Bearer admin' ? actor : { ...donor, canManageContent: false };
      req.user = current; next();
    } });
    const express = require('express'), app = express();
    app.use(express.json()); app.use('/api/safety', require('../dist/routes/safety.routes').default);
    app.use((err, _req, res, _next) => res.status(err.statusCode ?? 500).json({ error: err.message }));
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/safety`;
    assert.equal((await fetch(`${url}/reports`)).status, 401);
    assert.equal((await fetch(`${url}/reports`, { headers: { authorization: 'Bearer donor' } })).status, 403);
    assert.equal((await fetch(`${url}/reports`, { headers: { authorization: 'Bearer admin' } })).status, 200);
    assert.equal((await fetch(`${url}/reports`, { method: 'POST', headers: { authorization: 'Bearer admin', 'content-type': 'application/json' }, body: JSON.stringify(input) })).status, 403);
    assert.equal((await fetch(`${url}/blocks`, { method: 'POST', headers: { authorization: 'Bearer donor', 'content-type': 'application/json' }, body: JSON.stringify({ ngoId: '../invalid' }) })).status, 400);

    await safety.review(orgReport.id, actor, 'REMOVE_CONTENT', 'Organisation suspended after review');
    await assert.rejects(() => ngos.getNGO(ngo.slug), error => error.statusCode === 404);
    await assert.rejects(() => updates.getUpdateById(update.id), error => error.statusCode === 404);
    assert.equal((await needs.getAllFoodNeeds('1', '20', undefined, ngo.id)).items.length, 0);
    assert.equal((await needs.getFoodNeedById(need2.id)).id, need2.id);
    await safety.block(other.id, ngo2.id);
    await safety.report(other.id, { ...input, targetType: 'NGO', targetId: ngo2.id });
    await db.user.delete({ where: { id: other.id } });
    assert.equal(await db.safetyReport.count({ where: { reporterId: other.id } }), 0);
    assert.equal(await db.blockedOrganisation.count({ where: { userId: other.id } }), 0);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    const userIds = people.map(x => x.id), ngoIds = [ngo.id, ngo2.id];
    await db.safetyReport.deleteMany({ where: { reporterId: { in: userIds } } });
    await db.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await db.blockedOrganisation.deleteMany({ where: { ngoId: { in: ngoIds } } });
    await db.foodPledge.deleteMany({ where: { ngoId: { in: ngoIds } } });
    await db.foodNeed.deleteMany({ where: { ngoId: { in: ngoIds } } });
    await db.update.deleteMany({ where: { ngoId: { in: ngoIds } } });
    await db.nGOMember.deleteMany({ where: { ngoId: { in: ngoIds } } });
    await db.nGO.deleteMany({ where: { id: { in: ngoIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
  }
});
