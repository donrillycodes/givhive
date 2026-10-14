import Stripe from 'stripe';
import { env } from './env';
import { AppError } from '../middleware/error';

let stripe: InstanceType<typeof Stripe> | undefined;

// The food-pledge release can start without Stripe credentials. Existing
// payments/webhooks can still be processed when those credentials are supplied.
export function getStripe(): InstanceType<typeof Stripe> {
  if (!env.stripe.secretKey || env.stripe.secretKey === 'placeholder') {
    throw new AppError('Payment processing is not configured', 503);
  }
  stripe ??= new Stripe(env.stripe.secretKey, { apiVersion: '2026-03-25.dahlia' });
  return stripe;
}
