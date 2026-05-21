import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/response';
import * as authService from './auth.service';
import { config } from '../../config';
import { AppError } from '../../utils/AppError';
import { parseDuration } from '../../utils/duration';

const REFRESH_COOKIE_NAME = 'refreshToken';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: parseDuration(config.jwt.refreshTtl),
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, fullName, phone, role } = req.body;
  const result = await authService.register({ email, password, fullName, phone, role, req });
  // Note: no tokens issued at this stage – the user must verify their email first.
  return created(res, result);
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await authService.verifyEmail({ email, otp, req });
  setRefreshCookie(res, result.refreshToken);
  return ok(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await authService.resendOtp({ email, req });
  return ok(res, result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password, req });
  setRefreshCookie(res, result.refreshToken);
  return ok(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const tokenFromBody = (req.body && req.body.refreshToken) as string | undefined;
  const tokenFromCookie = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  const token = tokenFromBody || tokenFromCookie;
  if (!token) {
    throw AppError.unauthorized('Refresh token missing', 'NO_REFRESH_TOKEN');
  }
  const result = await authService.refresh({ refreshToken: token, req });
  setRefreshCookie(res, result.refreshToken);
  return ok(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const tokenFromBody = (req.body && req.body.refreshToken) as string | undefined;
  const tokenFromCookie = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  const token = tokenFromBody || tokenFromCookie;
  await authService.logout({ refreshToken: token, userId: req.user?.id, req });
  clearRefreshCookie(res);
  return ok(res, { message: 'logged out' });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  await authService.requestPasswordReset({ email, req });
  return ok(res, { message: 'If the account exists, a reset email has been sent.' });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;
  await authService.completePasswordReset({ token, password, req });
  return ok(res, { message: 'Password updated. Please sign in again.' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  return ok(res, { user });
});
