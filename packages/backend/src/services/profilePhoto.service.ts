import { createHash } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../middleware/error';
import { validateProfilePhoto } from '../utils/userProfile';

export class ProfilePhotoService {
  isConfigured() {
    return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  }

  publicId(firebaseUid: string) {
    return `givhive/avatars/${createHash('sha256').update(firebaseUid).digest('hex')}`;
  }

  isManagedPhoto(url: string | null, firebaseUid: string) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && parsed.hostname === 'res.cloudinary.com'
        && parsed.pathname.endsWith(`/${this.publicId(firebaseUid)}.jpg`);
    } catch { return false; }
  }

  private client() {
    if (!this.isConfigured()) throw new AppError('Profile photo uploads are not available yet. You can still save your name.', 503);
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
    return cloudinary;
  }

  async upload(firebaseUid: string, base64: string) {
    validateProfilePhoto(base64);
    const client = this.client();
    const publicId = this.publicId(firebaseUid);
    try {
      const result = await client.uploader.upload(`data:image/jpeg;base64,${base64}`, {
        resource_type: 'image', public_id: publicId, overwrite: true, invalidate: true,
        allowed_formats: ['jpg'], format: 'jpg', timeout: 15000,
        transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'center', quality: 80 }],
      });
      const prefix = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`;
      if (result.public_id !== publicId || result.format !== 'jpg' || !result.secure_url?.startsWith(prefix)) throw new Error();
      return result.secure_url;
    } catch {
      // Provider errors can include signed request data; never expose them.
      throw new AppError('Could not upload your profile photo. Please try again.', 503);
    }
  }

  async remove(publicId: string) {
    if (!/^givhive\/avatars\/[a-f0-9]{64}$/.test(publicId)) throw new AppError('Invalid profile photo', 400);
    const client = this.client();
    try {
      const options = { resource_type: 'image' as const, invalidate: true, timeout: 15000 };
      const result = await client.uploader.destroy(publicId, options);
      if (!['ok', 'not found'].includes(result.result)) throw new Error();
    } catch {
      throw new AppError('Could not remove your profile photo. Please try again.', 503);
    }
  }
}

export default new ProfilePhotoService();
