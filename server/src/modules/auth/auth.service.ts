import crypto from 'crypto';
import { Types } from 'mongoose';
import { parseDuration } from '../../utils/duration';
import { config } from '../../config';
import { User, UserDoc, UserRole } from '../../models/User';
import { RefreshToken } from '../../models/RefreshToken';
import { AppError } from '../../utils/AppError';
import { hashPassword, isStrongPassword, verifyPassword } from '../../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { audit } from '../../utils/audit';
import {
  passwordResetEmail,
  sendEmail,
  verifyEmailOtpMessage,
  welcomeEmail,
} from '../../utils/email';
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  generateOtp,
  hashOtp,
  timingSafeEqual,
} from '../../utils/otp';
import { Request } from 'express';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 min
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

interface AuthTokensPayload {
  user: Record<string, unknown>;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

async function issueTokenPair(user: UserDoc, req?: Request): Promise<AuthTokensPayload> {
  const tokenDocId = new Types.ObjectId();
  const refreshExpiresAt = new Date(Date.now() + parseDuration(config.jwt.refreshTtl));

  await RefreshToken.create({
    _id: tokenDocId,
    userId: user._id,
    expiresAt: refreshExpiresAt,
    ip: req?.ip,
    userAgent: req?.get('user-agent'),
  });

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
  });

  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    jti: tokenDocId.toString(),
  });

  return {
    user: user.toJSON(),
    accessToken,
    refreshToken,
    refreshExpiresAt,
  };
}

/**
 * Set a fresh OTP on the user document (if cooldown allows) and email it.
 * Mutates and saves the user.
 */
async function setAndSendOtp(user: UserDoc): Promise<void> {
  const otp = generateOtp();
  user.emailVerificationOtpHash = hashOtp(otp);
  user.emailVerificationExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  user.emailVerificationAttempts = 0;
  user.emailVerificationSentAt = new Date();
  await user.save();

  void sendEmail({
    ...verifyEmailOtpMessage(user.fullName, otp, Math.round(OTP_TTL_MS / 60_000)),
    to: user.email,
  });
}

export interface RegisterResult {
  email: string;
  verificationRequired: true;
  otpExpiresAt: Date;
  message: string;
}

export async function register(args: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: UserRole;
  req?: Request;
}): Promise<RegisterResult> {
  const { email, password, fullName, phone, req } = args;
  const role: UserRole = args.role === 'restaurant' ? 'restaurant' : 'customer';

  if (!isStrongPassword(password)) {
    throw AppError.badRequest(
      'Password must be at least 8 characters with letters and numbers',
      'WEAK_PASSWORD',
    );
  }

  const existing = await User.findOne({ email: email.toLowerCase() });

  if (existing) {
    // If the same email registered before but never verified, recycle the row:
    // refresh credentials and resend an OTP. This avoids users being permanently
    // stuck if they typo'd a name or lost the email.
    if (!existing.emailVerified) {
      existing.passwordHash = await hashPassword(password);
      existing.fullName = fullName;
      existing.phone = phone;
      existing.role = role;
      await existing.save();
      await setAndSendOtp(existing);
      await audit({ type: 'auth.register', userId: existing.id, role: existing.role, req });
      return {
        email: existing.email,
        verificationRequired: true,
        otpExpiresAt: existing.emailVerificationExpiresAt!,
        message: 'A verification code has been emailed. Please enter it to activate your account.',
      };
    }
    throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    fullName,
    phone,
    role,
    emailVerified: false,
  });

  await setAndSendOtp(user);
  await audit({ type: 'auth.register', userId: user.id, role: user.role, req });

  return {
    email: user.email,
    verificationRequired: true,
    otpExpiresAt: user.emailVerificationExpiresAt!,
    message: 'A verification code has been emailed. Please enter it to activate your account.',
  };
}

export async function verifyEmail(args: {
  email: string;
  otp: string;
  req?: Request;
}): Promise<AuthTokensPayload> {
  const { email, otp, req } = args;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+emailVerificationOtpHash +emailVerificationExpiresAt',
  );
  if (!user) {
    throw AppError.badRequest('No pending verification for this email', 'NO_PENDING_VERIFICATION');
  }
  if (user.emailVerified) {
    throw AppError.badRequest('Email is already verified. Please sign in.', 'ALREADY_VERIFIED');
  }
  if (!user.emailVerificationOtpHash || !user.emailVerificationExpiresAt) {
    throw AppError.badRequest(
      'No active code. Please request a new one.',
      'NO_ACTIVE_OTP',
    );
  }
  if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
    throw AppError.badRequest(
      'This code has expired. Please request a new one.',
      'OTP_EXPIRED',
    );
  }
  if (user.emailVerificationAttempts >= OTP_MAX_ATTEMPTS) {
    throw AppError.badRequest(
      'Too many incorrect attempts. Please request a new code.',
      'OTP_MAX_ATTEMPTS',
    );
  }

  const provided = hashOtp(otp.trim());
  if (!timingSafeEqual(provided, user.emailVerificationOtpHash)) {
    user.emailVerificationAttempts += 1;
    await user.save();
    await audit({
      type: 'auth.email.verify.failure',
      userId: user.id,
      req,
      outcome: 'failure',
      meta: { attempts: user.emailVerificationAttempts },
    });
    throw AppError.badRequest('Incorrect verification code', 'OTP_INCORRECT');
  }

  // Success
  user.emailVerified = true;
  user.emailVerificationOtpHash = null;
  user.emailVerificationExpiresAt = null;
  user.emailVerificationAttempts = 0;
  await user.save();

  void sendEmail({ ...welcomeEmail(user.fullName), to: user.email });
  await audit({ type: 'auth.email.verify.success', userId: user.id, role: user.role, req });

  return issueTokenPair(user, req);
}

export async function resendOtp(args: { email: string; req?: Request }): Promise<{
  email: string;
  cooldownSeconds?: number;
  otpExpiresAt: Date;
}> {
  const { email, req } = args;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw AppError.notFound('No pending verification for this email', 'NO_PENDING_VERIFICATION');
  }
  if (user.emailVerified) {
    throw AppError.badRequest('Email is already verified. Please sign in.', 'ALREADY_VERIFIED');
  }

  const lastSent = user.emailVerificationSentAt?.getTime() ?? 0;
  const since = Date.now() - lastSent;
  if (since < OTP_RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - since) / 1000);
    throw AppError.tooMany(
      `Please wait ${wait}s before requesting a new code`,
      'OTP_RESEND_COOLDOWN',
    );
  }

  await setAndSendOtp(user);
  await audit({ type: 'auth.email.otp.resend', userId: user.id, req });

  return {
    email: user.email,
    otpExpiresAt: user.emailVerificationExpiresAt!,
  };
}

export async function login(args: {
  email: string;
  password: string;
  req?: Request;
}): Promise<AuthTokensPayload> {
  const { email, password, req } = args;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    await audit({ type: 'auth.login.failure', req, outcome: 'failure', meta: { email } });
    throw AppError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
  }
  if (user.status === 'deactivated') {
    throw AppError.forbidden('Account deactivated', 'ACCOUNT_DEACTIVATED');
  }
  if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
    await audit({
      type: 'auth.login.locked',
      userId: user.id,
      req,
      outcome: 'failure',
      meta: { lockUntil: user.lockUntil },
    });
    throw AppError.locked('Account temporarily locked. Please try again later.', 'ACCOUNT_LOCKED');
  }

  const matches = await verifyPassword(password, user.passwordHash);
  if (!matches) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      user.failedLoginAttempts = 0;
      user.status = 'locked';
    }
    await user.save();
    await audit({ type: 'auth.login.failure', userId: user.id, req, outcome: 'failure' });
    throw AppError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  if (user.status === 'locked') user.status = 'active';
  await user.save();

  await audit({ type: 'auth.login.success', userId: user.id, role: user.role, req });

  return issueTokenPair(user, req);
}

export async function refresh(args: { refreshToken: string; req?: Request }): Promise<AuthTokensPayload> {
  const { refreshToken, req } = args;
  const claims = verifyRefreshToken(refreshToken);

  const tokenDoc = await RefreshToken.findById(claims.jti);
  if (!tokenDoc) {
    throw AppError.unauthorized('Refresh token not recognised', 'INVALID_REFRESH_TOKEN');
  }
  if (tokenDoc.revokedAt) {
    await RefreshToken.updateMany(
      { userId: tokenDoc.userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    throw AppError.unauthorized('Refresh token has been revoked', 'REVOKED_REFRESH_TOKEN');
  }
  if (tokenDoc.expiresAt.getTime() < Date.now()) {
    throw AppError.unauthorized('Refresh token expired', 'EXPIRED_REFRESH_TOKEN');
  }

  const user = await User.findById(tokenDoc.userId);
  if (!user || user.status === 'deactivated') {
    throw AppError.unauthorized('Account no longer accessible', 'ACCOUNT_GONE');
  }

  const newPair = await issueTokenPair(user, req);
  tokenDoc.revokedAt = new Date();
  tokenDoc.replacedBy = new Types.ObjectId(verifyRefreshToken(newPair.refreshToken).jti);
  await tokenDoc.save();

  await audit({ type: 'auth.refresh', userId: user.id, role: user.role, req });

  return newPair;
}

export async function logout(args: { refreshToken?: string; userId?: string; req?: Request }): Promise<void> {
  const { refreshToken, userId, req } = args;
  if (refreshToken) {
    try {
      const claims = verifyRefreshToken(refreshToken);
      await RefreshToken.findByIdAndUpdate(claims.jti, { revokedAt: new Date() });
    } catch {
      // ignore
    }
  } else if (userId) {
    await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  }
  await audit({ type: 'auth.logout', userId: userId ?? null, req });
}

export async function requestPasswordReset(args: { email: string; req?: Request }): Promise<void> {
  const { email, req } = args;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();

  const resetUrl = `${config.appUrl}/reset-password/${rawToken}`;
  void sendEmail({ ...passwordResetEmail(user.fullName, resetUrl), to: user.email });

  await audit({
    type: 'auth.password.reset.request',
    userId: user.id,
    req,
    meta: { email: user.email },
  });
}

export async function completePasswordReset(args: {
  token: string;
  password: string;
  req?: Request;
}): Promise<void> {
  const { token, password, req } = args;
  if (!isStrongPassword(password)) {
    throw AppError.badRequest('Password must be at least 8 characters with letters and numbers', 'WEAK_PASSWORD');
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpiresAt');
  if (!user) {
    throw AppError.badRequest('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
  }
  user.passwordHash = await hashPassword(password);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  if (user.status === 'locked') user.status = 'active';
  await user.save();

  await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });

  await audit({ type: 'auth.password.reset.complete', userId: user.id, role: user.role, req });
}

export async function getMe(userId: string): Promise<Record<string, unknown>> {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  return user.toJSON();
}

export async function updateProfile(args: {
  userId: string;
  fullName?: string;
  phone?: string;
  addresses?: Array<{
    _id?: string;
    label?: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    isDefault?: boolean;
  }>;
  req?: Request;
}): Promise<Record<string, unknown>> {
  const user = await User.findById(args.userId);
  if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');

  if (args.fullName !== undefined) user.fullName = args.fullName;
  if (args.phone !== undefined) user.phone = args.phone || undefined;
  if (args.addresses !== undefined) user.addresses = args.addresses as any;

  await user.save();
  await audit({ type: 'admin.action', userId: user.id, role: user.role, req: args.req, meta: { action: 'profile.update' } });
  return user.toJSON();
}
