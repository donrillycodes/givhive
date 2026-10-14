import { AppError } from '../middleware/error';

// Cash payments remain paused until the payment workflow and nonprofit onboarding
// are ready. Re-enabling requires an intentional backend and client release.
export const CASH_DONATIONS_ENABLED = false;

export function assertCashDonationsEnabled(): void {
  if (!CASH_DONATIONS_ENABLED) {
    throw new AppError('Cash donations are currently unavailable. You can support organisations through food pledges.', 503);
  }
}
