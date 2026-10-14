import { AppError } from '../middleware/error';

export function assertRecentAuthentication(authTime: number | undefined): void {
  const age = Date.now() / 1000 - (authTime ?? 0);
  if (!Number.isFinite(authTime) || age < -60 || age > 5 * 60) {
    throw new AppError('Please confirm your password again before deleting your account.', 403);
  }
}
