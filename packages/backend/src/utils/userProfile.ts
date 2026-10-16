import { AppError } from '../middleware/error';

export interface ProfileUpdate {
  firstName?: string;
  lastName?: string;
  photoBase64?: string | null;
}

export const MAX_PROFILE_PHOTO_BYTES = 1024 * 1024;

export function validateProfilePhoto(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 4 * Math.ceil(MAX_PROFILE_PHOTO_BYTES / 3)
      || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new AppError('Choose a JPEG profile photo smaller than 1 MB', 400);
  }
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length > MAX_PROFILE_PHOTO_BYTES || bytes.toString('base64') !== value
      || bytes.length < 5 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw new AppError('Choose a valid JPEG profile photo smaller than 1 MB', 400);
  }
  return value;
}

export function parseProfileUpdate(body: unknown): ProfileUpdate {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Please provide profile details to update', 400);
  }
  const input = body as Record<string, unknown>;
  if ('email' in input) throw new AppError('Your email address cannot be changed here', 400);

  const update: ProfileUpdate = {};
  for (const field of ['firstName', 'lastName'] as const) {
    if (!(field in input)) continue;
    const value = input[field];
    const label = field === 'firstName' ? 'First name' : 'Last name';
    if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(value)) {
      throw new AppError(`${label} must be between 2 and 100 characters`, 400);
    }
    update[field] = value.trim();
  }

  // Only the server may assign storage URLs and asset ownership.
  if ('avatarUrl' in input) throw new AppError('Choose a photo to upload instead of supplying a URL', 400);
  if ('photoBase64' in input) update.photoBase64 = input.photoBase64 === null ? null : validateProfilePhoto(input.photoBase64);
  if (!Object.keys(update).length) throw new AppError('At least one profile field must be provided', 400);
  return update;
}
