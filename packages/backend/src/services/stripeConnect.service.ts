import { getStripe } from '../config/stripe';
import { assertCashDonationsEnabled } from '../config/features';
import db from '../config/database';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import { env } from '../config/env';

export class StripeConnectService {
  // ── Create Connect account and return onboarding URL ──────────────────
  async createConnectAccount(ngoId: string) {
    assertCashDonationsEnabled();
    const ngo = await db.nGO.findUnique({
      where: { id: ngoId },
      select: {
        id: true,
        name: true,
        email: true,
        stripeAccountId: true,
        status: true,
      },
    });

    if (!ngo) throw new AppError('NGO not found', 404);
    if (ngo.status !== 'APPROVED') {
      throw new AppError('NGO must be approved before connecting Stripe', 403);
    }

    let accountId = ngo.stripeAccountId;

    // Create a new Connect account if one does not exist
    if (!accountId) {
      const account = await getStripe().accounts.create({
        type: 'express',
        email: ngo.email,
        business_profile: {
          name: ngo.name,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      // Save the account ID to the database
      await db.nGO.update({
        where: { id: ngoId },
        data: { stripeAccountId: accountId },
      });

      logger.info(
        `Stripe Connect account created: ${accountId} for NGO: ${ngoId}`
      );
    }

    // Generate onboarding link
    const accountLink = await getStripe().accountLinks.create({
      account: accountId,
      refresh_url: `${env.clientUrl}/ngo/stripe?refresh=true`,
      return_url: `${env.clientUrl}/ngo/stripe?success=true`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url, accountId };
  }

  // ── Get Connect account status ─────────────────────────────────────────
  async getConnectStatus(ngoId: string) {
    const ngo = await db.nGO.findUnique({
      where: { id: ngoId },
      select: { stripeAccountId: true },
    });

    if (!ngo) throw new AppError('NGO not found', 404);

    if (!ngo.stripeAccountId) {
      return {
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      };
    }

    const account = await getStripe().accounts.retrieve(ngo.stripeAccountId);

    return {
      connected: true,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      accountId: ngo.stripeAccountId,
    };
  }

  // ── Generate a new onboarding link for incomplete accounts ─────────────
  async refreshOnboardingLink(ngoId: string) {
    assertCashDonationsEnabled();
    const ngo = await db.nGO.findUnique({
      where: { id: ngoId },
      select: { stripeAccountId: true },
    });

    if (!ngo?.stripeAccountId) {
      throw new AppError('No Stripe account found. Please connect first.', 404);
    }

    const accountLink = await getStripe().accountLinks.create({
      account: ngo.stripeAccountId,
      refresh_url: `${env.clientUrl}/ngo/stripe?refresh=true`,
      return_url: `${env.clientUrl}/ngo/stripe?success=true`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  }

  // ── Disconnect Connect account ─────────────────────────────────────────
  async disconnectAccount(ngoId: string) {
    const ngo = await db.nGO.findUnique({
      where: { id: ngoId },
      select: { stripeAccountId: true },
    });

    if (!ngo?.stripeAccountId) {
      throw new AppError('No Stripe account connected', 404);
    }

    await db.nGO.update({
      where: { id: ngoId },
      data: { stripeAccountId: null },
    });

    logger.info(`Stripe Connect account disconnected for NGO: ${ngoId}`);
    return { success: true };
  }
}

export default new StripeConnectService();
