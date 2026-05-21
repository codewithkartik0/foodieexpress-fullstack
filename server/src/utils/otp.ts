import crypto from 'crypto';

/** OTP lifetime in milliseconds (10 minutes). */
export const OTP_TTL_MS = 10 * 60 * 1000;

/** How long the user must wait between resends (60 seconds). */
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

/** Maximum verify attempts allowed for a single OTP before invalidating it. */
export const OTP_MAX_ATTEMPTS = 5;

/** Generate a numeric 6-digit OTP as a string (zero-padded). */
export function generateOtp(): string {
  // crypto.randomInt is uniformly distributed
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, '0');
}

/** SHA-256 hash of the OTP — fast, irreversible, suitable for short-lived secrets. */
export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/** Constant-time comparison of two hashes. */
export function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
