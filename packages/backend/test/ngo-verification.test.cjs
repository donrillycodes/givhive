const { test } = require('node:test');
const assert = require('node:assert/strict');

// Exercise validation and service decisions without touching live credentials or data.
const db = {};
let emails = [];
function stub(path, value) {
  const id = require.resolve(path);
  require.cache[id] = { id, filename: id, loaded: true, exports: { __esModule: true, default: value } };
}
stub('../dist/config/database', db);
stub('../dist/utils/logger', { info() {}, warn() {}, error() {}, debug() {} });
stub('../dist/services/email.service', {
  async sendNGOApproved(...args) { emails.push(args); },
  async sendNGOApplicationReceived() {},
});
const { parseNGOInput, validateNGOApplication, parseNGOReview } = require('../dist/utils/ngoVerification');
const { NGOService } = require('../dist/services/ngo.service');
const service = new NGOService();

const application = {
  name: 'Neighbourhood Food Group', email: 'team@example.org', phone: '2045550100',
  description: 'Local food support', category: 'COMMUNITY', orgType: 'COMMUNITY_GROUP',
  primaryContactName: 'Alex Smith', primaryContactTitle: 'Coordinator',
  address: '123 Main Street', city: 'Winnipeg', province: 'Manitoba', country: 'Canada', postalCode: 'R3C 0A1',
  foodDonationDetails: '123 Main Street, weekdays 9–5; canned food only, dry storage; Alex receives deliveries.',
};
const review = {
  organisationChecked: true, representativeConfirmed: true, foodOperationsConfirmed: true,
  evidenceSources: 'Official community centre website confirms the group and contact number.',
  contactMethod: 'Called independently sourced centre number and spoke to its director.',
  contactedAt: '2026-01-01', notes: 'Director confirmed Alex is authorised and confirmed dry food receiving arrangements.',
  applicationUpdatedAt: '2026-01-02T12:00:00.000Z',
};

function setup(overrides = {}) {
  let row = { ...application, id: 'ngo-1', managerId: 'owner-1', status: 'PENDING',
    updatedAt: new Date(review.applicationUpdatedAt), verifiedAt: null, verifiedById: null,
    manager: { email: 'owner@example.org' }, ...overrides };
  const records = [];
  const writes = [];
  db.nGO = {
    async findUnique() { return { ...row }; },
    async updateMany({ where, data }) {
      if ((where.status && where.status !== row.status) || where.updatedAt.getTime() !== row.updatedAt.getTime()) return { count: 0 };
      writes.push(data);
      row = { ...row, ...data };
      return { count: 1 };
    },
    async findUniqueOrThrow() { return { ...row }; },
  };
  db.nGOReview = { async create({ data }) { records.push(data); return data; } };
  db.$transaction = async (callback) => callback(db);
  emails = [];
  return { records, writes, current: () => row };
}

test('community groups can apply without CRA numbers; contact and food arrangements are required', () => {
  assert.doesNotThrow(() => validateNGOApplication(application));
  for (const key of ['orgType', 'primaryContactName', 'primaryContactTitle', 'phone', 'foodDonationDetails']) {
    assert.throws(() => validateNGOApplication({ ...application, [key]: '' }), { statusCode: 400 });
  }
});

test('registered charities must supply a full CRA number; normalisation and field allowlist apply', () => {
  assert.throws(() => validateNGOApplication({ ...application, orgType: 'REGISTERED_CHARITY' }), { statusCode: 400 });
  const input = parseNGOInput({ ...application, email: ' TEAM@Example.org ', orgType: 'REGISTERED_CHARITY',
    craNumber: '123456789 rr 0001', status: 'APPROVED', verifiedById: 'attacker', reviews: [{}] });
  validateNGOApplication(input);
  assert.equal(input.craNumber, '123456789RR0001');
  assert.equal(input.email, 'team@example.org');
  assert.equal(input.status, undefined);
  assert.equal(input.verifiedById, undefined);
  assert.equal(input.reviews, undefined);
});

test('invalid data and unsafe URLs are rejected', () => {
  for (const body of [null, [], { phone: {} }, { website: 'javascript:alert(1)' }, { name: 'x'.repeat(5001) }]) {
    assert.throws(() => parseNGOInput(body), { statusCode: 400 });
  }
});

test('approval requires explicit checks, evidence, contact date and notes', () => {
  for (const key of ['organisationChecked', 'representativeConfirmed', 'foodOperationsConfirmed']) {
    assert.throws(() => parseNGOReview({ ...review, [key]: 'true' }), { statusCode: 400 });
  }
  for (const change of [{ evidenceSources: '' }, { notes: 'yes' }, { contactMethod: '' }, { contactedAt: '2999-01-01' }, { applicationUpdatedAt: 'invalid' }]) {
    assert.throws(() => parseNGOReview({ ...review, ...change }), { statusCode: 400 });
  }
});

test('an NGO manager cannot edit another organisation', async () => {
  const state = setup();
  await assert.rejects(service.updateNGO('ngo-1', { name: 'Impersonation' }, 'other-owner'), { statusCode: 403 });
  assert.equal(state.writes.length, 0);
});

test('identity changes remove current approval and return the organisation to review', async () => {
  const state = setup({ status: 'APPROVED', verifiedById: 'admin-1', verifiedAt: new Date() });
  await service.updateNGO('ngo-1', { primaryContactName: 'New Contact' }, 'owner-1');
  assert.equal(state.current().status, 'PENDING');
  assert.equal(state.current().verifiedAt, null);
  assert.equal(state.current().verifiedById, null);
});

test('public description edits return an approved profile to review', async () => {
  const state = setup({ status: 'APPROVED' });
  await service.updateNGO('ngo-1', { ...application, description: 'Updated description' }, 'owner-1');
  assert.equal(state.current().status, 'PENDING');
});

test('applicants cannot restore their own approval or edit review evidence', async () => {
  const state = setup({ status: 'SUSPENDED' });
  await service.updateNGO('ngo-1', { status: 'APPROVED', verifiedAt: '2026-01-01', reviews: [{}], description: 'New description' }, 'owner-1');
  assert.equal(state.current().status, 'SUSPENDED');
  assert.equal(state.records.length, 0);
});

test('approval saves evidence, reviewer and application snapshot in the same transaction', async () => {
  const state = setup();
  await service.approveNGO('ngo-1', 'admin-1', review);
  assert.equal(state.current().status, 'APPROVED');
  assert.equal(state.records.length, 1);
  assert.equal(state.records[0].reviewerId, 'admin-1');
  assert.equal(state.records[0].applicationSnapshot.primaryContactName, application.primaryContactName);
  assert.equal(state.records[0].applicationSnapshot.foodDonationDetails, application.foodDonationDetails);
  assert.equal(state.records[0].applicationSnapshot.applicationUpdatedAt, review.applicationUpdatedAt);
  assert.equal(state.records[0].applicationSnapshot.manager, undefined);
  assert.equal(emails.length, 1);
});

test('stale reviews cannot approve a changed application', async () => {
  const state = setup({ updatedAt: new Date('2026-01-03T12:00:00Z') });
  await assert.rejects(service.approveNGO('ngo-1', 'admin-1', review), { statusCode: 409 });
  assert.equal(state.records.length, 0);
  assert.equal(emails.length, 0);
});

test('self approval, repeat approval and invalid application states are blocked', async () => {
  setup();
  await assert.rejects(service.approveNGO('ngo-1', 'owner-1', review), { statusCode: 403 });
  for (const status of ['APPROVED', 'REJECTED', 'SUSPENDED']) {
    const state = setup({ status });
    await assert.rejects(service.approveNGO('ngo-1', 'admin-1', review), { statusCode: 409 });
    assert.equal(state.records.length, 0);
  }
});

test('evidence storage failure prevents a success response or approval email', async () => {
  setup();
  db.nGOReview.create = async () => { throw new Error('Storage unavailable'); };
  await assert.rejects(service.approveNGO('ngo-1', 'admin-1', review), /Storage unavailable/);
  assert.equal(emails.length, 0);
});

test('unchanged profile values preserve approval', async () => {
  const state = setup({ status: 'APPROVED' });
  await service.updateNGO('ngo-1', { ...application }, 'owner-1');
  assert.equal(state.current().status, 'APPROVED');
});
