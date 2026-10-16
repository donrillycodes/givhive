const { test } = require('node:test');
const assert = require('node:assert/strict');

const db = {};
let firebaseFailure = false;
let firebaseUpdates = [];
function stub(path, value) {
  const id = require.resolve(path);
  require.cache[id] = { id, filename: id, loaded: true, exports: { __esModule: true, default: value } };
}
stub('../dist/config/database', db);
stub('../dist/config/firebase', { auth: () => ({ async updateUser(...args) {
  firebaseUpdates.push(args);
  if (firebaseFailure) throw new Error('Provider unavailable');
} }) });
stub('../dist/utils/logger', { info() {}, warn() {}, error() {}, debug() {} });
const { parseProfileUpdate } = require('../dist/utils/userProfile');
const { UserService } = require('../dist/services/user.service');
const service = new UserService();
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0xff, 0xd9]).toString('base64');

test('profile updates trim names and allow international names', () => {
  assert.deepEqual(parseProfileUpdate({ firstName: '  Émile ', lastName: ' O’Connor  ' }), {
    firstName: 'Émile', lastName: 'O’Connor',
  });
  assert.deepEqual(parseProfileUpdate({ firstName: 'Alex' }), { firstName: 'Alex' });
});

test('empty, malformed and overlong names are rejected instead of ignored', () => {
  for (const body of [null, [], {}, { firstName: '' }, { lastName: '  ' }, { firstName: 123 },
    { lastName: {} }, { firstName: ['Alex'] }, { lastName: 'x'.repeat(101) }, { firstName: 'Alex\nSmith' }]) {
    assert.throws(() => parseProfileUpdate(body), { statusCode: 400 });
  }
});

test('email changes are rejected and account access fields cannot be mass assigned', () => {
  assert.throws(() => parseProfileUpdate({ firstName: 'Alex', email: 'other@example.org' }), { statusCode: 400 });
  assert.deepEqual(parseProfileUpdate({ firstName: 'Alex', id: 'other-user', role: 'SUPER_ADMIN', isActive: true }), {
    firstName: 'Alex',
  });
  assert.throws(() => parseProfileUpdate({ role: 'ADMIN' }), { statusCode: 400 });
});

test('photos can be removed; clients cannot assign arbitrary storage URLs', () => {
  assert.deepEqual(parseProfileUpdate({ photoBase64: null }), { photoBase64: null });
  assert.deepEqual(parseProfileUpdate({ photoBase64: jpeg }), { photoBase64: jpeg });
  for (const avatarUrl of ['file:///tmp/photo.jpg', 'data:image/png;base64,123', 'http://example.org/a.jpg',
    'https://user:password@example.org/a.jpg', {}, 'https://example.org/' + 'a'.repeat(2048)]) {
    assert.throws(() => parseProfileUpdate({ avatarUrl }), { statusCode: 400 });
  }
});

test('invalid or oversized photo payloads are rejected before storage access', () => {
  for (const photoBase64 of ['', 'file:///local.jpg', 'data:image/jpeg;base64,abc', 'AAAA', {},
    Buffer.alloc(1024 * 1024 + 1).toString('base64')]) {
    assert.throws(() => parseProfileUpdate({ photoBase64 }), { statusCode: 400 });
  }
});

test('service updates only the authenticated target and keeps Firebase display name in sync', async () => {
  firebaseFailure = false;
  firebaseUpdates = [];
  let written;
  db.user = {
    async update(args) { written = args; return { id: 'signed-in-user', firebaseUid: 'firebase-1', firstName: 'Alex', lastName: 'Smith', email: 'original@example.org' }; },
  };
  const user = await service.updateProfile('signed-in-user', { firstName: ' Alex ', id: 'another-user', role: 'ADMIN' });
  assert.deepEqual(written.where, { id: 'signed-in-user' });
  assert.deepEqual(written.data, { firstName: 'Alex' });
  assert.equal(user.email, 'original@example.org');
  assert.equal(user.firebaseUid, undefined);
  assert.deepEqual(firebaseUpdates, [['firebase-1', { displayName: 'Alex Smith' }]]);
});

test('a Firebase display-name failure does not report a failed database save', async () => {
  firebaseFailure = true;
  db.user = {
    async update() { return { id: 'user-1', firebaseUid: 'firebase-1', firstName: 'Alex', lastName: 'Smith' }; },
  };
  assert.equal((await service.updateProfile('user-1', { firstName: 'Alex' })).firstName, 'Alex');
  firebaseFailure = false;
});
