import dotenv from 'dotenv';
import path from 'path';

// In test mode, skip loading .env so real secrets (e.g. STRIPE_SECRET_KEY,
// MONGODB_URI for an Atlas cluster) don't leak into the in-memory test setup.
// Tests rely on the safe defaults below, plus any vars they set explicitly.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Error(`Env var ${name} must be a number`);
  return n;
}

const env = (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test';

export const config = {
  env,
  isProd: env === 'production',
  isTest: env === 'test',
  port: num('PORT', 5000),

  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/foodieexpress'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-do-not-use-in-prod'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-do-not-use-in-prod'),
    accessTtl: optional('JWT_ACCESS_TTL', '30m'),
    refreshTtl: optional('JWT_REFRESH_TTL', '14d'),
  },

  bcryptCost: num('BCRYPT_COST', 12),

  clientOrigins: optional('CLIENT_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  stripe: {
    secretKey: optional('STRIPE_SECRET_KEY'),
    webhookSecret: optional('STRIPE_WEBHOOK_SECRET'),
    currency: optional('STRIPE_CURRENCY', 'inr'),
  },

  smtp: {
    host: optional('SMTP_HOST'),
    port: num('SMTP_PORT', 587),
    secure: optional('SMTP_SECURE', 'false') === 'true',
    user: optional('SMTP_USER'),
    pass: optional('SMTP_PASS'),
    from: optional('EMAIL_FROM', 'FoodieExpress <no-reply@foodieexpress.dev>'),
  },

  appUrl: optional('APP_URL', 'http://localhost:5173'),

  pricing: {
    taxRate: num('TAX_RATE', 0.05),
    deliveryFee: num('DELIVERY_FEE', 49),
  },

  rateLimit: {
    windowMs: num('RATE_LIMIT_WINDOW_MS', 60_000),
    max: num('RATE_LIMIT_MAX', 120),
  },
};

export type AppConfig = typeof config;
