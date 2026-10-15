import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireRole } from '../middleware/rbac';
import safety from '../services/safety.service';
import { responses } from '../utils/apiResponse';
import { AppError } from '../middleware/error';

const router = Router();
const run = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { void handler(req, res).catch(next); };
const id = (value: unknown) => {
  if (typeof value !== 'string' || !/^[a-f\d-]{36}$/i.test(value)) throw new AppError('Invalid identifier', 400);
  return value;
};
router.use(authenticate);
const donor = requireRole('DONOR');
const reportLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, keyGenerator: req => req.user!.id,
  message: { success: false, message: 'Too many reports. Please try again later or contact support@givhive.com.' } });
router.post('/reports', donor, reportLimiter, run(async (req, res) => {
  responses.created(res, 'Report received. Our moderation team will review it.', { report: await safety.report(req.user!.id, req.body ?? {}) });
}));
router.get('/blocks', donor, run(async (req, res) => {
  responses.ok(res, 'Blocked organisations', { items: await safety.blocks(req.user!.id) });
}));
router.post('/blocks', donor, run(async (req, res) => {
  await safety.block(req.user!.id, id(req.body?.ngoId)); responses.ok(res, 'Organisation blocked');
}));
router.delete('/blocks/:ngoId', donor, run(async (req, res) => {
  await safety.unblock(req.user!.id, id(req.params.ngoId)); responses.ok(res, 'Organisation unblocked');
}));
router.get('/pending', requirePermission('canManageContent'), run(async (_req, res) => {
  responses.ok(res, 'Content awaiting review', { items: await safety.pending() });
}));
router.patch('/pending/:type/:id', requirePermission('canManageContent'), run(async (req, res) => {
  responses.ok(res, 'Content reviewed', await safety.reviewPending(String(req.params.type), id(req.params.id), req.user!.id, req.body?.action, req.body?.version, req.body?.notes));
}));
router.get('/reports', requirePermission('canManageContent'), run(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new AppError('Invalid page', 400);
  responses.ok(res, 'Safety reports', await safety.reports(typeof req.query.status === 'string' ? req.query.status : 'OPEN', page));
}));
router.patch('/reports/:id', requirePermission('canManageContent'), run(async (req, res) => {
  responses.ok(res, 'Report reviewed', await safety.review(id(req.params.id), req.user!, req.body?.action, req.body?.notes));
}));
export default router;
