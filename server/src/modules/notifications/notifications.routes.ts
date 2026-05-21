import { Request, Response, Router } from 'express';
import Joi from 'joi';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, noContent } from '../../utils/response';
import { requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import { Notification } from '../../models/Notification';
import { AppError } from '../../utils/AppError';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const list = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(50, Number(req.query.limit ?? 20));
  const items = await Notification.find({ userId: req.user!.id }).sort({ createdAt: -1 }).limit(limit).lean();
  const unread = await Notification.countDocuments({ userId: req.user!.id, read: false });
  return ok(res, items, { meta: { unread } });
});

const markRead = asyncHandler(async (req: Request, res: Response) => {
  const n = await Notification.findOne({ _id: req.params.id, userId: req.user!.id });
  if (!n) throw AppError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
  n.read = true;
  await n.save();
  return ok(res, n.toJSON());
});

const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await Notification.updateMany({ userId: req.user!.id, read: false }, { $set: { read: true } });
  return noContent(res);
});

const router = Router();
router.use(requireAuth);
router.get('/', list);
router.patch('/:id/read', validate({ params: Joi.object({ id: objectId.required() }) }), markRead);
router.post('/read-all', markAllRead);

export default router;
