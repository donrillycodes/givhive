import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { responses, sendSuccess } from '../utils/apiResponse';
import { RegisterInput } from '../types';

export class AuthController {
  // POST /api/auth/register
  async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password, firstName, lastName, role }: RegisterInput =
        req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        responses.badRequest(
          res,
          'Email, password, first name, and last name are required'
        );
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        responses.badRequest(res, 'Please provide a valid email address');
        return;
      }

      // Validate password length
      if (password.length < 6) {
        responses.badRequest(
          res,
          'Password must be at least 6 characters long'
        );
        return;
      }

      // Validate name fields
      if (firstName.trim().length < 2 || lastName.trim().length < 2) {
        responses.badRequest(
          res,
          'First name and last name must be at least 2 characters long'
        );
        return;
      }

      const user = await authService.register({
        email: email.toLowerCase().trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
      });

      responses.created(res, 'Account created successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/auth/me
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        responses.unauthorized(res);
        return;
      }

      const user = await authService.getMe(req.user.id);
      responses.ok(res, 'User profile retrieved successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/sync
  // Called by mobile app after social login (Google, Apple)
  async syncUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        responses.unauthorized(res);
        return;
      }

      const user = await authService.syncFirebaseUser(req.user.firebaseUid);
      responses.ok(res, 'User synced successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/auth/account
  async deleteAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        responses.unauthorized(res);
        return;
      }

      const result = await authService.deleteAccount(req.user.id, req.user.firebaseUid, req.user.authTime);
      // The service writes a minimal audit event inside the erasure transaction.
      // Do not recreate deleted profile data, IP addresses or user agents here.
      sendSuccess({
        res,
        statusCode: result.status === 'completed' ? 200 : 202,
        message: result.status === 'completed' ? 'Account deleted successfully' : 'Account removed; sign-in deletion is finishing. We will email you when it is complete.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
