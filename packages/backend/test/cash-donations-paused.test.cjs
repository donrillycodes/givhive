const { test } = require('node:test');
const assert = require('node:assert/strict');

function stub(path, value) {
  const id = require.resolve(path);
  require.cache[id] = { id, filename: id, loaded: true, exports: { __esModule: true, default: value } };
}
let effects = 0;
const unexpectedEffect = () => { effects++; throw new Error('Unexpected payment side effect'); };
stub('../dist/utils/logger', { info() {}, warn() {}, error() {}, debug() {} });
const db = { nGO: { findUnique: unexpectedEffect }, user: { findUnique: unexpectedEffect } };
stub('../dist/config/database', db);
stub('../dist/services/email.service', {});
const envId = require.resolve('../dist/config/env');
const env = { stripe: {}, clientUrl: 'https://example.org' };
require.cache[envId] = { id: envId, filename: envId, loaded: true, exports: { env } };

// Importing the Stripe configuration must not require credentials while payments are paused.
const { getStripe } = require('../dist/config/stripe');
const { DonationService } = require('../dist/services/donation.service');
const { StripeConnectService } = require('../dist/services/stripeConnect.service');
const donations = new DonationService();
const connect = new StripeConnectService();

test('payment creation and Connect onboarding reject before database or Stripe access', async () => {
  for (const operation of [
    () => donations.createPaymentIntent({ ngoId: 'ngo-1', amount: 5 }, 'donor-1'),
    () => donations.createCheckoutSession({ ngoId: 'ngo-1', amount: 5 }, 'donor-1'),
    () => connect.createConnectAccount('ngo-1'),
    () => connect.refreshOnboardingLink('ngo-1'),
  ]) {
    await assert.rejects(operation(), error => error.statusCode === 503 && /food pledges/.test(error.message));
  }
  assert.equal(effects, 0);
});

test('missing Stripe credentials do not break imports, and fail clearly if legacy processing needs them', () => {
  assert.throws(() => getStripe(), { statusCode: 503 });
});

test('donors can still retrieve their own historical payment records', async () => {
  db.donation = { async findUnique() { return { id: 'past-donation', status: 'COMPLETED', donor: { id: 'donor-1' } }; } };
  assert.equal((await donations.getDonationById('past-donation', 'donor-1')).status, 'COMPLETED');
});

test('signed legacy webhook retries remain accepted while new payments are paused', async () => {
  // Stripe signature generation/verification is local; this makes no network calls.
  env.stripe.secretKey = 'sk_test_signature_verification_only';
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local_test_secret';
  db.donation = { async findFirst() { return { id: 'past-donation', status: 'COMPLETED' }; } };
  try {
    const payload = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed', data: { object: { id: 'cs_test' } } });
    const header = getStripe().webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    assert.deepEqual(await donations.handleWebhookEvent(Buffer.from(payload), header), { received: true });
    await assert.rejects(donations.handleWebhookEvent(Buffer.from(payload), 'invalid-signature'), { statusCode: 400 });
  } finally {
    if (previousSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
  }
});
