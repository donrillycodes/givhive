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
const uploadedBy = [], removed = [];
let failUpload = false;
stub('../dist/config/database', db);
stub('../dist/config/firebase', { auth: () => ({ async updateUser() {} }) });
stub('../dist/utils/logger', { info() {}, warn() {}, error() {}, debug() {} });
stub('../dist/services/profilePhoto.service', {
  isConfigured: () => true, isManagedPhoto: () => true, publicId: uid => `test/${uid}`,
  async upload(uid) { uploadedBy.push(uid); if (failUpload) throw new Error('Provider unavailable'); return `https://example.org/${uid}.jpg`; },
  async remove(id) { removed.push(id); },
});
const { UserService } = require('../dist/services/user.service');
const service = new UserService();
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0xff, 0xd9]).toString('base64');
after(() => db.$disconnect());

test('profile names and photo ownership persist without modifying email or another account', async () => {
  const people = [];
  const makeUser = async () => {
    const user = await db.user.create({ data: { firstName: 'Before', lastName: 'Test', email: `${randomUUID()}@example.org`, firebaseUid: randomUUID() } });
    people.push(user.id); return user;
  };
  try {
    const owner = await makeUser(), other = await makeUser();
    const updated = await service.updateProfile(owner.id, { firstName: ' After ', photoBase64: jpeg, id: other.id, firebaseUid: other.firebaseUid });
    assert.equal(updated.firstName, 'After');
    assert.equal(updated.email, owner.email);
    assert.equal(updated.firebaseUid, undefined);
    assert.equal(updated.avatarUrl, `https://example.org/${owner.firebaseUid}.jpg`);
    assert.deepEqual(uploadedBy, [owner.firebaseUid]);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: other.id } })).avatarUrl, null);
    await assert.rejects(service.updateProfile(owner.id, { firstName: 'Nope', email: other.email }), { statusCode: 400 });
    failUpload = true;
    await assert.rejects(service.updateProfile(owner.id, { firstName: 'Failed', photoBase64: jpeg }));
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).firstName, 'After');
    failUpload = false;
    await service.updateProfile(owner.id, { photoBase64: null });
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).avatarUrl, null);
    assert.deepEqual(removed, [`test/${owner.firebaseUid}`]);
    await db.user.update({ where: { id: owner.id }, data: { isActive: false } });
    const attempts = uploadedBy.length;
    await assert.rejects(service.updateProfile(owner.id, { photoBase64: jpeg }), { statusCode: 403 });
    assert.equal(uploadedBy.length, attempts);
  } finally {
    await db.user.deleteMany({ where: { id: { in: people } } });
  }
});
