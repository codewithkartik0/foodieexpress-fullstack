import request from 'supertest';
import type { Express } from 'express';
import { setupTestDb, teardownTestDb, clearAllCollections } from './setup';
import { User } from '../src/models/User';

let app: Express;

beforeAll(async () => {
  ({ app } = await setupTestDb());
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearAllCollections();
});

const validUser = {
  email: 'jane@example.com',
  password: 'Password1!',
  fullName: 'Jane Doe',
};

/** Helper – register and immediately mark the user as verified, then login. */
async function registerAndVerify(payload: typeof validUser) {
  const reg = await request(app).post('/api/v1/auth/register').send(payload);
  expect(reg.status).toBe(201);
  // Manually flip emailVerified for tests so we don't need to mock email + extract OTP
  await User.updateOne({ email: payload.email.toLowerCase() }, { $set: { emailVerified: true } });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: payload.email, password: payload.password });
  expect(login.status).toBe(200);
  return login.body.data as { user: { _id: string }; accessToken: string; refreshToken: string };
}

describe('POST /api/v1/auth/register', () => {
  it('creates an unverified user and asks for OTP', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.data.verificationRequired).toBe(true);
    expect(res.body.data.email).toBe(validUser.email);
    // No tokens at this stage
    expect(res.body.data.accessToken).toBeUndefined();
  });

  it('rejects weak passwords', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, password: 'short' });
    expect([400, 422]).toContain(res.status);
  });

  it('recycles unverified registration (lets user retry)', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    // Same email, still unverified — should succeed (and resend OTP) instead of 409
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.data.verificationRequired).toBe(true);
  });

  it('returns 409 only after the user is already verified', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    await User.updateOne({ email: validUser.email.toLowerCase() }, { $set: { emailVerified: true } });
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });
});

describe('POST /api/v1/auth/verify-email', () => {
  it('rejects an incorrect OTP', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email: validUser.email, otp: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OTP_INCORRECT');
  });

  it('accepts the correct OTP and issues tokens', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    // Read the OTP hash directly from the DB and compute the matching plaintext
    // by reusing the hash function on candidate codes – but we can't reverse it,
    // so instead we just stamp a known OTP into the user via the model.
    const { hashOtp } = await import('../src/utils/otp');
    await User.updateOne(
      { email: validUser.email.toLowerCase() },
      {
        $set: {
          emailVerificationOtpHash: hashOtp('123456'),
          emailVerificationExpiresAt: new Date(Date.now() + 10 * 60_000),
          emailVerificationAttempts: 0,
        },
      },
    );
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email: validUser.email, otp: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.emailVerified).toBe(true);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('rejects login when email is not yet verified', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('returns tokens for valid credentials when verified', async () => {
    const data = await registerAndVerify(validUser);
    expect(data.accessToken).toBeDefined();
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nope@example.com', password: validUser.password });
    expect(res.status).toBe(401);
  });

  it('rejects wrong password with 401', async () => {
    await registerAndVerify(validUser);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: 'WrongPassword1!' });
    expect(res.status).toBe(401);
  });

  it('locks account after 5 failed attempts', async () => {
    await registerAndVerify(validUser);
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validUser.email, password: 'WrongPassword1!' });
    }
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(423);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });
});

describe('GET /api/v1/auth/me', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user with a valid token', async () => {
    const data = await registerAndVerify(validUser);
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${data.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('rejects tampered tokens', async () => {
    const data = await registerAndVerify(validUser);
    const token = data.accessToken + 'x';
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('issues a new pair and revokes the old refresh token', async () => {
    const data = await registerAndVerify(validUser);
    const oldRefresh = data.refreshToken;
    const r1 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: oldRefresh });
    expect(r1.status).toBe(200);
    expect(r1.body.data.accessToken).toBeDefined();
    expect(r1.body.data.refreshToken).not.toBe(oldRefresh);

    const r2 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: oldRefresh });
    expect(r2.status).toBe(401);
  });
});
