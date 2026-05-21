import { Router } from 'express';
import * as ctrl from './auth.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { authLimiter } from '../../middleware/rateLimit';
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordParamsSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.validators';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), ctrl.register);
router.post('/verify-email', authLimiter, validate({ body: verifyEmailSchema }), ctrl.verifyEmail);
router.post('/resend-otp', authLimiter, validate({ body: resendOtpSchema }), ctrl.resendOtp);

router.post('/login', authLimiter, validate({ body: loginSchema }), ctrl.login);
router.post('/refresh', validate({ body: refreshSchema }), ctrl.refresh);
router.post('/logout', validate({ body: logoutSchema }), ctrl.logout);

router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), ctrl.forgotPassword);
router.put(
  '/reset-password/:token',
  authLimiter,
  validate({ params: resetPasswordParamsSchema, body: resetPasswordSchema }),
  ctrl.resetPassword,
);

router.get('/me', requireAuth, ctrl.me);

export default router;
