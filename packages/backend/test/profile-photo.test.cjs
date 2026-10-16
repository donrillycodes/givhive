const { test } = require('node:test');
const assert = require('node:assert/strict');
const { v2: cloudinary } = require('cloudinary');
const id = require.resolve('../dist/utils/logger');
require.cache[id] = { id, filename: id, loaded: true, exports: { __esModule: true, default: { info() {}, warn() {}, error() {} } } };
const { ProfilePhotoService } = require('../dist/services/profilePhoto.service');
const service = new ProfilePhotoService();
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0xff, 0xd9]).toString('base64');
let calls;
const setup = () => {
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
  calls = [];
  cloudinary.config = () => {};
  cloudinary.uploader.upload = async (file, options) => {
    calls.push({ file, options });
    return { public_id: options.public_id, format: 'jpg', secure_url: `https://res.cloudinary.com/test-cloud/image/upload/v2/${options.public_id}.jpg` };
  };
  cloudinary.uploader.destroy = async (publicId, options) => { calls.push({ publicId, options }); return { result: 'ok' }; };
};

test('uploads one bounded JPEG to an owner-derived asset with server-controlled transformations', async () => {
  setup();
  const url = await service.upload('owner-uid', jpeg);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.public_id, service.publicId('owner-uid'));
  assert.notEqual(service.publicId('owner-uid'), service.publicId('other-uid'));
  assert.equal(calls[0].options.overwrite, true);
  assert.equal(calls[0].options.invalidate, true);
  assert.equal(calls[0].options.transformation[0].width, 512);
  assert.equal(service.isManagedPhoto(url, 'owner-uid'), true);
  assert.equal(service.isManagedPhoto(url, 'other-uid'), false);
});

test('malformed uploads and missing credentials cannot call storage', async () => {
  setup();
  await assert.rejects(service.upload('owner', 'AAAA'), { statusCode: 400 });
  delete process.env.CLOUDINARY_API_SECRET;
  await assert.rejects(service.upload('owner', jpeg), { statusCode: 503 });
  assert.equal(calls.length, 0);
});

test('provider failures and unexpected asset responses never leak credentials', async () => {
  setup();
  cloudinary.uploader.upload = async () => { throw new Error('test-secret'); };
  await assert.rejects(service.upload('owner', jpeg), error => error.statusCode === 503 && !error.message.includes('test-secret'));
  cloudinary.uploader.upload = async () => ({ public_id: 'someone-else', format: 'jpg', secure_url: 'https://example.org/image.jpg' });
  await assert.rejects(service.upload('owner', jpeg), { statusCode: 503 });
});

test('deletion accepts a missing asset and invalidates cached copies; rejects arbitrary asset IDs', async () => {
  setup();
  cloudinary.uploader.destroy = async (id, options) => { calls.push({ id, options }); return { result: 'not found' }; };
  await service.remove(service.publicId('owner'));
  assert.equal(calls[0].options.invalidate, true);
  await assert.rejects(service.remove('some-other-folder/photo'), { statusCode: 400 });
  assert.equal(calls.length, 1);
});
