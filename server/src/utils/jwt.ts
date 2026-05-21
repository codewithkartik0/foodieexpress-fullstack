import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './AppError';

export type Role = 'customer' | 'restaurant' | 'admin';

export interface AccessTokenClaims extends JwtPayload {
  sub: string; // user id
  role: Role;
  email: string;
}

export interface RefreshTokenClaims extends JwtPayload {
  sub: string; // user id
  jti: string; // refresh-token doc id (allows revocation)
}

const ALG = 'HS256' as const;

export function signAccessToken(claims: Omit<AccessTokenClaims, 'iat' | 'exp'>): string {
  const opts: SignOptions = { algorithm: ALG, expiresIn: config.jwt.accessTtl as SignOptions['expiresIn'] };
  return jwt.sign(claims, config.jwt.accessSecret, opts);
}

export function signRefreshToken(claims: Omit<RefreshTokenClaims, 'iat' | 'exp'>): string {
  const opts: SignOptions = { algorithm: ALG, expiresIn: config.jwt.refreshTtl as SignOptions['expiresIn'] };
  return jwt.sign(claims, config.jwt.refreshSecret, opts);
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret, { algorithms: [ALG] }) as AccessTokenClaims;
    if (!payload.sub || !payload.role) throw new Error('malformed claims');
    return payload;
  } catch {
    throw AppError.unauthorized('Invalid or expired access token', 'INVALID_TOKEN');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  try {
    const payload = jwt.verify(token, config.jwt.refreshSecret, { algorithms: [ALG] }) as RefreshTokenClaims;
    if (!payload.sub || !payload.jti) throw new Error('malformed claims');
    return payload;
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }
}
