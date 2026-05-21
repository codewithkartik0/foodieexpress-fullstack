<<<<<<< HEAD
# FoodieExpress

A full-stack, multi-role food-delivery web application built on the **MERN stack** with **TypeScript**.

> Reference: project report **"FoodieExpress – A Full-Stack Food Delivery Web Application"** (MCA, MRIIRS, 2026).

This monorepo contains:

```
foodie-express/
├── client/   # React 18 + TypeScript + Vite + Tailwind frontend (3 SPAs in 1)
├── server/   # Node.js 20 + Express 4 + TypeScript + Mongoose backend
├── render.yaml  # one-click deployment blueprint for Render
└── README.md
```

## Highlights

- **Three roles** through one codebase — Customer, Restaurant Owner, Platform Administrator (RBAC enforced server-side).
- **Email OTP verification** for new sign-ups (6-digit code, 10-min expiry, max 5 attempts, 60-sec resend cooldown).
- **Stateless JWT auth** with access + refresh tokens, refresh-token rotation, account lockout, password reset.
- **Stripe-backed payments** (PaymentIntent + idempotent webhook), plus Cash-on-Delivery.
- **Order lifecycle**: Placed → Accepted → Preparing → Out for Delivery → Delivered / Cancelled.
- **Restaurant analytics** dashboard (revenue, orders, top items, ratings).
- **Platform admin** — restaurant approvals, audit logs, global view.
- **Append-only audit log** of authentication, authorisation denials, and admin changes.
- **Mongoose** schemas with strict validation, explicit indexes, compound indexes for hot queries.
- **Async email** (Nodemailer + any SMTP provider) for OTP, welcome, receipt, password-reset.
- **Tailwind-styled responsive UI** for desktop, tablet, mobile (≥360 px).
- **Jest + Supertest** tests for auth, orders, payments, RBAC.
- **Seed script** for instant demo data (admin, sample restaurants, menus, customers).

---

## Quick start (local development)

### Prerequisites

| Tool         | Version   |
|--------------|-----------|
| Node.js      | 20 LTS or newer (24 also works) |
| npm          | 10+       |
| MongoDB      | 6.0+ (local, or MongoDB Atlas connection string) |
| Stripe acct. | optional, test-mode keys for payments |
| SMTP creds.  | optional, leave blank to log emails to console |

### 1. Open the project folder

```powershell
cd "C:\Users\rawat\Desktop\KA\New folder\foodie-express"
```

### 2. Backend setup

```powershell
cd server
copy .env.example .env   # then edit .env values (esp. MONGODB_URI)
npm install
npm run seed             # populate sample data (optional but recommended)
npm run dev              # starts API at http://localhost:5000
```

### 3. Frontend setup (in a second terminal)

```powershell
cd client
copy .env.example .env   # API URL + Stripe publishable key
npm install
npm run dev              # starts Vite dev server at http://localhost:5173
```

Open `http://localhost:5173` in your browser.

### Default seeded credentials

After running `npm run seed` in `server/`:

| Role               | Email                     | Password       |
|--------------------|---------------------------|----------------|
| Platform Admin     | admin@foodieexpress.dev   | Admin@12345    |
| Restaurant Owner 1 | owner.spice@foodie.dev    | Owner@12345    |
| Restaurant Owner 2 | owner.pizza@foodie.dev    | Owner@12345    |
| Restaurant Owner 3 | owner.sushi@foodie.dev    | Owner@12345    |
| Customer           | customer@foodie.dev       | Customer@12345 |

All seeded users have `emailVerified: true` so they can log in immediately.

---

## Environment variables

### `server/.env`

```
NODE_ENV=development
PORT=5000

# MongoDB (local or Atlas)
MONGODB_URI=mongodb://127.0.0.1:27017/foodieexpress

# JWT secrets - use 32+ bytes of random data each
JWT_ACCESS_SECRET=replace-with-strong-random-string
JWT_REFRESH_SECRET=replace-with-different-strong-random-string
JWT_ACCESS_TTL=30m
JWT_REFRESH_TTL=14d

# Bcrypt cost factor (12 ≈ 100ms per hash)
BCRYPT_COST=12

# CORS - allowed origin(s), comma-separated
CLIENT_ORIGIN=http://localhost:5173

# Stripe (test mode); leave as-is to use the dev mock checkout
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
STRIPE_CURRENCY=inr

# SMTP (leave SMTP_HOST blank to log emails to stdout instead of sending)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="FoodieExpress <no-reply@foodieexpress.dev>"

# Frontend URL (used in password-reset emails)
APP_URL=http://localhost:5173

# Pricing defaults
TAX_RATE=0.05
DELIVERY_FEE=49

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

### `client/.env`

```
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
```

---

## NPM scripts

### Server

| Script              | Purpose                                       |
|---------------------|-----------------------------------------------|
| `npm run dev`       | Hot-reload dev server (ts-node-dev)           |
| `npm run build`     | Compile TypeScript to `dist/`                 |
| `npm start`         | Run compiled JS from `dist/`                  |
| `npm test`          | Run Jest test suite                           |
| `npm run lint`      | ESLint check                                  |
| `npm run seed`      | Seed sample data into MongoDB                 |
| `npm run typecheck` | `tsc --noEmit`                                |

### Client

| Script              | Purpose                                       |
|---------------------|-----------------------------------------------|
| `npm run dev`       | Vite dev server                               |
| `npm run build`     | Production build to `dist/`                   |
| `npm run preview`   | Preview the production build locally          |
| `npm run lint`      | ESLint check                                  |
| `npm run typecheck` | `tsc --noEmit`                                |

---

## API surface (v1)

All endpoints are prefixed `/api/v1`. Responses follow `{ data, meta, error }`.

| Method | Path                                       | Auth | Role                  |
|--------|--------------------------------------------|------|-----------------------|
| POST   | `/auth/register`                           | —    | —                     |
| POST   | `/auth/verify-email`                       | —    | —                     |
| POST   | `/auth/resend-otp`                         | —    | —                     |
| POST   | `/auth/login`                              | —    | —                     |
| POST   | `/auth/refresh`                            | —    | —                     |
| POST   | `/auth/logout`                             | ✓    | any                   |
| POST   | `/auth/forgot-password`                    | —    | —                     |
| PUT    | `/auth/reset-password/:token`              | —    | —                     |
| GET    | `/auth/me`                                 | ✓    | any                   |
| GET    | `/restaurants`                             | —    | —                     |
| GET    | `/restaurants/:id`                         | —    | —                     |
| POST   | `/restaurants`                             | ✓    | restaurant            |
| PATCH  | `/restaurants/:id`                         | ✓    | restaurant / admin    |
| GET    | `/menu-items`                              | —    | —                     |
| POST   | `/menu-items`                              | ✓    | restaurant / admin    |
| PATCH  | `/menu-items/:id`                          | ✓    | restaurant / admin    |
| DELETE | `/menu-items/:id`                          | ✓    | restaurant / admin    |
| GET    | `/cart`                                    | ✓    | customer              |
| POST   | `/cart/items`                              | ✓    | customer              |
| PATCH  | `/cart/items/:id`                          | ✓    | customer              |
| DELETE | `/cart/items/:id`                          | ✓    | customer              |
| DELETE | `/cart`                                    | ✓    | customer              |
| POST   | `/orders`                                  | ✓    | customer              |
| GET    | `/orders`                                  | ✓    | customer / restaurant |
| GET    | `/orders/:id`                              | ✓    | order participant     |
| PATCH  | `/orders/:id/status`                       | ✓    | restaurant / admin    |
| POST   | `/orders/:id/cancel`                       | ✓    | customer              |
| POST   | `/payments/intent`                         | ✓    | customer              |
| POST   | `/payments/webhook`                        | —    | (Stripe-signed)       |
| POST   | `/reviews`                                 | ✓    | customer              |
| GET    | `/reviews/restaurant/:id`                  | —    | —                     |
| GET    | `/admin/restaurants`                       | ✓    | admin                 |
| PATCH  | `/admin/restaurants/:id/approval`          | ✓    | admin                 |
| GET    | `/admin/audit-logs`                        | ✓    | admin                 |
| GET    | `/admin/stats`                             | ✓    | admin                 |
| GET    | `/restaurant-admin/stats`                  | ✓    | restaurant            |

---

## Email OTP setup (Gmail App Password)

To send real verification emails instead of logging them to the terminal:

1. Enable 2-Step Verification on your Gmail account: https://myaccount.google.com/security
2. Generate an App Password: https://myaccount.google.com/apppasswords (name it "FoodieExpress").
3. Edit `server/.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your.gmail@gmail.com
   SMTP_PASS=<the 16-char app password, no spaces>
   EMAIL_FROM="FoodieExpress <your.gmail@gmail.com>"
   ```
4. Restart `npm run dev`. Newly-registered accounts will receive a 6-digit OTP at their email.

If `SMTP_HOST` is left blank, OTPs are printed to the backend terminal as `[email:stdout]` log lines — useful for development.

---

## Deployment

A `render.yaml` blueprint is included for one-click deployment to Render:

| Component | Render service type | Notes |
|-----------|--------------------|-------|
| Frontend  | Static Site         | Set `VITE_API_BASE_URL` to the backend's URL + `/api/v1`. |
| Backend   | Web Service         | Set `MONGODB_URI`, `CLIENT_ORIGIN`, optional Stripe / SMTP secrets. |
| Database  | MongoDB Atlas (M0)  | Network Access: `0.0.0.0/0` (or static IP if on a paid plan). |

Steps:

1. Push this repo to any Git hosting service Render supports.
2. On Render: **New + → Blueprint → connect repo**. It picks up `render.yaml` and proposes both services.
3. Fill in the secrets marked `sync: false`.
4. After both services first deploy, set `CLIENT_ORIGIN` and `APP_URL` on the backend = the frontend URL; set `VITE_API_BASE_URL` on the frontend = backend URL + `/api/v1`. Both services redeploy automatically.
5. (Optional) Configure a Stripe webhook → `https://your-api.onrender.com/api/v1/payments/webhook` and put the signing secret in `STRIPE_WEBHOOK_SECRET`.

---

## Testing

Backend tests use Jest + Supertest with `mongodb-memory-server` so the suite runs without a real MongoDB instance:

```powershell
cd server
npm test
```

Suite covers: register + OTP verify, login (rejects unverified, lockout after 5 failed attempts), JWT validation, refresh-token rotation, RBAC, cart pricing, order placement, status lifecycle transitions, cross-customer isolation, payment dev-mock flow.

---

## License

Academic project. Educational use only.
=======
# foodieexpress-fullstack
>>>>>>> ba284283b5f5e39dfcbcb2728759dc992bcfad8a
