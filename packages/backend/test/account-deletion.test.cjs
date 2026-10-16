const { test } = require('node:test');
const assert = require('node:assert/strict');
function stub(path, value) {
  const id = require.resolve(path);
  require.cache[id] = { id, filename: id, loaded: true, exports: { __esModule: true, default: value } };
}
const db = {};
let firebaseCalls, mailCalls, providerFailure, mailSuccess;
let decodedUser, revocationChecks;
let photoCalls, photoFailure, photosConfigured;
stub('../dist/config/database', db);
stub('../dist/config/firebase', { auth: () => ({ async deleteUser(uid) {
  firebaseCalls.push(uid);
  if (providerFailure) throw providerFailure;
}, async verifyIdToken(token, checkRevoked) { revocationChecks.push(checkRevoked); return decodedUser; } }) });
stub('../dist/utils/logger', { info() {}, warn() {}, error() {}, debug() {} });
stub('../dist/services/email.service', { async sendAccountDeletionConfirmation(...args) {
  mailCalls.push(args); return mailSuccess;
} });
stub('../dist/services/profilePhoto.service', {
  isConfigured: () => photosConfigured,
  isManagedPhoto: () => false,
  publicId: () => 'givhive/avatars/test-owner',
  async remove(id) { photoCalls.push(id); if (photoFailure) throw new Error('Storage unavailable'); },
});
const { AccountDeletionService } = require('../dist/services/accountDeletion.service');
const { assertRecentAuthentication } = require('../dist/utils/recentAuthentication');
const service = new AccountDeletionService();
const { authenticate, authenticateForAccountDeletion } = require('../dist/middleware/auth');
const { AuthController } = require('../dist/controllers/auth.controller');
const now = () => Math.floor(Date.now() / 1000);

function setup(overrides = {}) {
  photoCalls = []; photoFailure = false; photosConfigured = false;
  firebaseCalls = []; mailCalls = []; providerFailure = null; mailSuccess = true;
  decodedUser = { uid: 'firebase-1', auth_time: now() }; revocationChecks = [];
  const calls = [];
  const jobs = new Map();
  const user = { id: 'donor-1', firebaseUid: 'firebase-1', email: 'donor@example.org', role: 'DONOR',
    managedNgo: null, _count: { postedNeeds: 0, postedUpdates: 0, ngoReviews: 0, sentInvitesNgo: 0, sentInvitesAdmin: 0, sentInvitations: 0 }, ...overrides };
  db.user = { async findUnique() { return user; }, async delete(args) { calls.push(['user.delete', args]); } };
  db.$queryRaw = async (...args) => { calls.push(['lock', args]); return []; };
  db.$executeRaw = async (...args) => { calls.push(['quantity', args]); return 1; };
  db.foodPledge = {
    async findMany() { return [
      { id: 'pledge-active', foodNeedId: 'need-1', quantityPledged: 4, status: 'CONFIRMED' },
      { id: 'pledge-done', foodNeedId: 'need-1', quantityPledged: 2, status: 'FULFILLED' },
    ]; },
    async deleteMany(args) { calls.push(['foodPledge.deleteMany', args]); return { count: 2 }; },
  };
  db.donation = {
    async findMany() { return [{ id: 'donation-1' }]; },
    async updateMany(args) { calls.push(['donation.updateMany', args]); return { count: 1 }; },
  };
  for (const model of ['notification', 'donorPreference', 'nGOMember', 'adminMember', 'invitation']) {
    db[model] = { async deleteMany(args) { calls.push([`${model}.deleteMany`, args]); return { count: 1 }; } };
  }
  db.auditLog = {
    async deleteMany(args) { calls.push(['auditLog.deleteMany', args]); return { count: 1 }; },
    async create(args) { calls.push(['auditLog.create', args]); },
  };
  db.accountDeletion = {
    async create({ data }) {
      const job = { id: 'deletion-1', requestedAt: new Date(), attempts: 0, lastAttemptAt: null, ...data };
      jobs.set(job.id, job); return { ...job };
    },
    async updateMany({ where, data }) {
      const job = jobs.get(where.id);
      if (job) Object.assign(job, data, { attempts: data.attempts ? job.attempts + 1 : job.attempts });
      return { count: job ? 1 : 0 };
    },
    async deleteMany({ where }) { jobs.delete(where.id); return { count: 1 }; },
    async findMany(args) { calls.push(['jobs.findMany', args]); return Array.from(jobs.values()).map(job => ({ ...job })); },
  };
  db.$transaction = async (callback) => callback(db);
  return { calls, jobs, user };
}

test('account deletion durably retries photo cleanup before removing the provider identity', async () => {
  const state = setup();
  photosConfigured = true;
  photoFailure = true;
  assert.deepEqual(await service.deleteAccount('donor-1', 'firebase-1', now()), { status: 'pending' });
  assert.equal(state.jobs.get('deletion-1').avatarPublicId, 'givhive/avatars/test-owner');
  assert.equal(firebaseCalls.length, 0);
  photoFailure = false;
  await service.processPendingDeletions();
  assert.equal(state.jobs.size, 0);
  assert.deepEqual(photoCalls, ['givhive/avatars/test-owner', 'givhive/avatars/test-owner']);
  assert.deepEqual(firebaseCalls, ['firebase-1']);
});

test('fresh authentication is required and future/invalid timestamps cannot bypass it', () => {
  for (const time of [undefined, NaN, Infinity, now() - 301, now() + 61]) {
    assert.throws(() => assertRecentAuthentication(time), { statusCode: 403 });
  }
  assert.doesNotThrow(() => assertRecentAuthentication(now()));
});

test('stale authentication rejects before database or Firebase mutations', async () => {
  const state = setup();
  await assert.rejects(service.deleteAccount('donor-1', 'firebase-1', now() - 600), { statusCode: 403 });
  assert.equal(state.calls.length, 0); assert.equal(firebaseCalls.length, 0);
});

test('identity mismatch and organisation-linked accounts cannot delete a donor account', async () => {
  for (const override of [{ firebaseUid: 'someone-else' }, { role: 'NGO' }, { managedNgo: { id: 'ngo-1' } },
    { _count: { postedNeeds: 1 } }]) {
    const state = setup(override);
    await assert.rejects(service.deleteAccount('donor-1', 'firebase-1', now()), error => [404, 409].includes(error.statusCode));
    assert.equal(state.jobs.size, 0); assert.equal(firebaseCalls.length, 0);
  }
});

test('deletes profile and personal records, unlinks payments, and releases only outstanding pledge quantities', async () => {
  const state = setup();
  assert.deepEqual(await service.deleteAccount('donor-1', 'firebase-1', now()), { status: 'completed' });
  assert.equal(state.calls.filter(([name]) => name === 'quantity').length, 1);
  const scrub = state.calls.find(([name]) => name === 'donation.updateMany')[1];
  assert.deepEqual(scrub.data, { donorId: null, message: null, refundReason: null, isAnonymous: true });
  for (const name of ['user.delete', 'foodPledge.deleteMany', 'donorPreference.deleteMany', 'notification.deleteMany', 'invitation.deleteMany']) {
    assert.ok(state.calls.some(([called]) => called === name));
  }
  const audit = state.calls.find(([name]) => name === 'auditLog.create')[1].data;
  assert.equal(audit.entityId, 'deletion-1');
  assert.equal(audit.actorId, undefined); assert.equal(audit.ipAddress, undefined);
  assert.equal(audit.userAgent, undefined); assert.equal(audit.previousState, undefined);
  assert.deepEqual(firebaseCalls, ['firebase-1']); assert.equal(state.jobs.size, 0);
});

test('database failure never deletes Firebase or reports completion', async () => {
  setup();
  db.user.delete = async () => { throw new Error('Database unavailable'); };
  await assert.rejects(service.deleteAccount('donor-1', 'firebase-1', now()), /Database unavailable/);
  assert.equal(firebaseCalls.length, 0);
});

test('Firebase outage keeps durable cleanup work and background retry sends completion', async () => {
  const state = setup(); providerFailure = { code: 'auth/internal-error' };
  assert.deepEqual(await service.deleteAccount('donor-1', 'firebase-1', now()), { status: 'pending' });
  assert.equal(state.jobs.size, 1);
  providerFailure = null;
  await service.processPendingDeletions();
  assert.equal(state.jobs.size, 0);
  assert.deepEqual(mailCalls, [['donor@example.org', 'deletion-1']]);
  const query = state.calls.find(([name]) => name === 'jobs.findMany')[1];
  assert.equal(query.orderBy[0].lastAttemptAt.nulls, 'first');
});

test('an already-deleted Firebase identity is an idempotent success', async () => {
  const state = setup(); providerFailure = { code: 'auth/user-not-found' };
  assert.deepEqual(await service.deleteAccount('donor-1', 'firebase-1', now()), { status: 'completed' });
  assert.equal(state.jobs.size, 0);
});

test('failed completion mail retries without calling Firebase again, and address retention is bounded', async () => {
  const state = setup(); providerFailure = { code: 'auth/internal-error' };
  await service.deleteAccount('donor-1', 'firebase-1', now());
  providerFailure = null; mailSuccess = false;
  await service.processPendingDeletions();
  assert.equal(state.jobs.get('deletion-1').firebaseUid, null);
  const count = firebaseCalls.length;
  await service.processPendingDeletions();
  assert.equal(firebaseCalls.length, count);
  state.jobs.get('deletion-1').requestedAt = new Date(Date.now() - 8 * 86400000);
  await service.processPendingDeletions();
  assert.equal(state.jobs.size, 0);
});

test('old tokens cannot authenticate once the application user is removed', async () => {
  setup(); db.user.findUnique = async () => null;
  const req = { headers: { authorization: 'Bearer old-token' } };
  let error;
  await authenticate(req, {}, failure => { error = failure; });
  assert.equal(error.statusCode, 401); assert.equal(req.user, undefined);
});

test('deletion checks token revocation and permits an otherwise suspended donor to erase data', async () => {
  setup({ isActive: false });
  const req = { headers: { authorization: 'Bearer valid-token' } };
  let error;
  await authenticateForAccountDeletion(req, {}, failure => { error = failure; });
  assert.equal(error, undefined); assert.equal(req.user.authTime, decodedUser.auth_time);
  assert.deepEqual(revocationChecks, [true]);
  await authenticate({ headers: req.headers }, {}, failure => { error = failure; });
  assert.equal(error.statusCode, 403);
});

test('the API reports 200 only for completed cleanup and 202 for durable pending cleanup', async () => {
  for (const pending of [false, true]) {
    setup(); providerFailure = pending ? { code: 'auth/internal-error' } : null;
    let code, body, failure;
    const res = { status(value) { code = value; return this; }, json(value) { body = value; return this; } };
    await new AuthController().deleteAccount({ user: { id: 'donor-1', firebaseUid: 'firebase-1', authTime: now() } }, res, error => { failure = error; });
    assert.equal(failure, undefined); assert.equal(code, pending ? 202 : 200);
    assert.equal(body.data.status, pending ? 'pending' : 'completed');
  }
});
