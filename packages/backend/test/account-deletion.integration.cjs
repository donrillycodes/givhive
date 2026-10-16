const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL must point to a disposable migrated database');
const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
function stub(path, value) {
  const id = require.resolve(path);
  require.cache[id] = { id, filename: id, loaded: true, exports: { __esModule: true, default: value } };
}
let providerFails = false;
const firebaseCalls = [];
const mailCalls = [];
stub('../dist/config/database', db);
stub('../dist/services/profilePhoto.service', { isConfigured: () => false, isManagedPhoto: () => false });
stub('../dist/config/firebase', { auth: () => ({ async deleteUser(uid) {
  firebaseCalls.push(uid);
  if (providerFails) throw new Error('Temporary provider outage');
} }) });
stub('../dist/services/email.service', { async sendAccountDeletionConfirmation(...args) { mailCalls.push(args); return true; } });
stub('../dist/utils/logger', { info() {}, warn() {}, error() {}, debug() {} });
const { AccountDeletionService } = require('../dist/services/accountDeletion.service');
const service = new AccountDeletionService();
after(() => db.$disconnect());

async function fixture() {
  const suffix = randomUUID();
  const startedAt = new Date();
  const createUser = (role, name) => db.user.create({ data: { role, firstName: name, lastName: 'Test',
    email: `${name}-${suffix}@example.org`, firebaseUid: `${name}-${suffix}` } });
  const donor = await createUser('DONOR', 'Donor');
  const owner = await createUser('NGO', 'Owner');
  const other = await createUser('DONOR', 'Other');
  const ngo = await db.nGO.create({ data: { name: 'Deletion test NGO', slug: `deletion-${suffix}`,
    email: `ngo-${suffix}@example.org`, description: 'Test', category: 'FOOD_BANK',
    address: '123 Test Street', postalCode: 'R3C 0A1', status: 'APPROVED', managerId: owner.id } });
  const makeNeed = (status, quantityFulfilled, deadline) => db.foodNeed.create({ data: {
    ngoId: ngo.id, postedById: owner.id, title: 'Test food need', itemName: 'Rice', itemCategory: 'GRAINS', unit: 'bags',
    quantityRequired: 7, quantityFulfilled, status, deadline,
  } });
  const open = await makeNeed('FULFILLED', 7);
  const closed = await makeNeed('CLOSED', 3);
  const expired = await makeNeed('EXPIRED', 2);
  const overdue = await makeNeed('FULFILLED', 1, new Date(Date.now() - 86400000));
  for (const [need, quantityPledged, status] of [[open, 4, 'PENDING'], [open, 2, 'FULFILLED'],
    [closed, 3, 'CONFIRMED'], [expired, 2, 'CONFIRMED'], [overdue, 1, 'PENDING']]) {
    await db.foodPledge.create({ data: { donorId: donor.id, ngoId: ngo.id, foodNeedId: need.id,
      quantityPledged, status, notes: 'Private donor note' } });
  }
  const otherPledge = await db.foodPledge.create({ data: { donorId: other.id, ngoId: ngo.id,
    foodNeedId: open.id, quantityPledged: 1, status: 'FULFILLED', notes: 'Keep this' } });
  const donation = await db.donation.create({ data: { donorId: donor.id, ngoId: ngo.id, amount: 5,
    status: 'COMPLETED', paymentProvider: 'STRIPE', providerPaymentId: `pi_${suffix}`,
    message: 'Private donor message', refundReason: 'Private refund note' } });
  const ownPledge = await db.foodPledge.findFirstOrThrow({ where: { donorId: donor.id } });
  await db.notification.createMany({ data: [
    { userId: donor.id, title: 'Private', body: 'Donor details', type: 'PLEDGE_CONFIRMED' },
    { userId: owner.id, title: 'New pledge', body: donor.email, type: 'PLEDGE_RECEIVED', referenceType: 'FOOD_PLEDGE', referenceId: ownPledge.id },
    { userId: owner.id, title: 'Cash gift', body: donor.email, type: 'DONATION_CONFIRMED', referenceType: 'DONATION', referenceId: donation.id },
    { userId: other.id, title: 'Keep this', body: 'Unrelated notification', type: 'NEW_FOOD_NEED' },
  ] });
  await db.donorPreference.create({ data: { userId: donor.id, categories: ['FOOD_BANK'] } });
  await db.invitation.create({ data: { email: donor.email, token: suffix, type: 'NGO_MEMBER', permissions: {},
    invitedById: owner.id, expiresAt: new Date(Date.now() + 86400000), ngoId: ngo.id } });
  await db.auditLog.createMany({ data: [
    { action: 'USER_CREATED', actorRole: 'DONOR', actorId: donor.id, entityType: 'USER', entityId: donor.id, notes: donor.email },
    { action: 'DONATION_COMPLETED', actorRole: 'SYSTEM', entityType: 'DONATION', entityId: donation.id, notes: donor.email },
  ] });
  return { donor, owner, other, ngo, open, closed, expired, overdue, donation, otherPledge,
    async cleanup() {
      const ids = [donor.id, owner.id, other.id];
      await db.accountDeletion.deleteMany({ where: { email: donor.email } });
      await db.notification.deleteMany({ where: { userId: { in: ids } } });
      await db.invitation.deleteMany({ where: { ngoId: ngo.id } });
      await db.donorPreference.deleteMany({ where: { userId: { in: ids } } });
      await db.foodPledge.deleteMany({ where: { ngoId: ngo.id } });
      await db.foodNeed.deleteMany({ where: { ngoId: ngo.id } });
      await db.donation.deleteMany({ where: { ngoId: ngo.id } });
      await db.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: donor.id },
        { entityId: donation.id }, { notes: 'Donor account and personal data removed', createdAt: { gte: startedAt } }] } });
      await db.nGO.delete({ where: { id: ngo.id } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    },
  };
}

test('deletes the donor and personal data, unlinks payments, and preserves correct food totals', async () => {
  providerFails = false;
  const f = await fixture();
  try {
    assert.deepEqual(await service.deleteAccount(f.donor.id, f.donor.firebaseUid, Date.now() / 1000), { status: 'completed' });
    assert.equal(await db.user.findUnique({ where: { id: f.donor.id } }), null);
    assert.equal(await db.foodPledge.count({ where: { donorId: f.donor.id } }), 0);
    assert.equal(await db.donorPreference.count({ where: { userId: f.donor.id } }), 0);
    assert.equal(await db.notification.count({ where: { OR: [{ userId: f.donor.id }, { body: f.donor.email }] } }), 0);
    assert.equal(await db.notification.count({ where: { userId: f.other.id } }), 1);
    assert.equal(await db.invitation.count({ where: { email: f.donor.email } }), 0);
    assert.equal(await db.auditLog.count({ where: { OR: [{ actorId: f.donor.id }, { notes: f.donor.email }] } }), 0);
    const payment = await db.donation.findUniqueOrThrow({ where: { id: f.donation.id }, include: { donor: true } });
    assert.equal(payment.donorId, null); assert.equal(payment.donor, null);
    assert.equal(payment.message, null); assert.equal(payment.refundReason, null); assert.equal(payment.isAnonymous, true);
    assert.equal(payment.amount.toString(), '5'); assert.equal(payment.providerPaymentId, f.donation.providerPaymentId);
    for (const [need, quantity, status] of [[f.open, 3, 'OPEN'], [f.closed, 0, 'CLOSED'], [f.expired, 0, 'EXPIRED'], [f.overdue, 0, 'EXPIRED']]) {
      const result = await db.foodNeed.findUniqueOrThrow({ where: { id: need.id } });
      assert.equal(result.quantityFulfilled, quantity); assert.equal(result.status, status);
    }
    assert.equal((await db.foodPledge.findUniqueOrThrow({ where: { id: f.otherPledge.id } })).notes, 'Keep this');
    assert.equal(await db.accountDeletion.count({ where: { email: f.donor.email } }), 0);
    assert.ok(firebaseCalls.includes(f.donor.firebaseUid));
  } finally { await f.cleanup(); }
});

test('all erasure and quantity changes roll back when database deletion fails', async () => {
  const f = await fixture();
  const firebaseCount = firebaseCalls.length;
  await db.$executeRawUnsafe(`CREATE FUNCTION test_fail_user_deletion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test deletion failure'; END $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER test_fail_user_deletion BEFORE DELETE ON users FOR EACH ROW EXECUTE FUNCTION test_fail_user_deletion()`);
  try {
    await assert.rejects(service.deleteAccount(f.donor.id, f.donor.firebaseUid, Date.now() / 1000), /test deletion failure/);
    assert.ok(await db.user.findUnique({ where: { id: f.donor.id } }));
    assert.equal(await db.foodPledge.count({ where: { donorId: f.donor.id } }), 5);
    assert.equal((await db.foodNeed.findUniqueOrThrow({ where: { id: f.open.id } })).quantityFulfilled, 7);
    assert.equal((await db.donation.findUniqueOrThrow({ where: { id: f.donation.id } })).message, 'Private donor message');
    assert.equal(await db.accountDeletion.count({ where: { email: f.donor.email } }), 0);
    assert.equal(firebaseCalls.length, firebaseCount);
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER test_fail_user_deletion ON users');
    await db.$executeRawUnsafe('DROP FUNCTION test_fail_user_deletion()');
    await f.cleanup();
  }
});

test('Firebase failure queues cleanup; restart worker completes it without restoring the account', async () => {
  const f = await fixture(); providerFails = true;
  try {
    assert.deepEqual(await service.deleteAccount(f.donor.id, f.donor.firebaseUid, Date.now() / 1000), { status: 'pending' });
    assert.equal(await db.user.findUnique({ where: { id: f.donor.id } }), null);
    const job = await db.accountDeletion.findFirstOrThrow({ where: { firebaseUid: f.donor.firebaseUid } });
    providerFails = false;
    await new AccountDeletionService().processPendingDeletions();
    assert.equal(await db.accountDeletion.findUnique({ where: { id: job.id } }), null);
    assert.ok(mailCalls.some(([email, deletionId]) => email === f.donor.email && deletionId === job.id));
  } finally { providerFails = false; await f.cleanup(); }
});
