import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { requestLogger } from './middleware/requestLogger';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import restaurantRoutes from './modules/restaurants/restaurants.routes';
import menuItemRoutes from './modules/menuItems/menuItems.routes';
import cartRoutes from './modules/cart/cart.routes';
import orderRoutes from './modules/orders/orders.routes';
import paymentRoutes from './modules/payments/payments.routes';
import * as paymentsCtrl from './modules/payments/payments.controller';
import reviewRoutes from './modules/reviews/reviews.routes';
import adminRoutes from './modules/admin/admin.routes';
import notificationRoutes from './modules/notifications/notifications.routes';

export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        // Same-origin / curl / health checks
        if (!origin) return cb(null, true);
        if (config.clientOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    }),
  );

  app.use(cookieParser());
  app.use(compression());
  app.use(requestLogger);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime(), env: config.env, time: new Date().toISOString() });
  });

  // Stripe webhook MUST be mounted with raw body BEFORE express.json
  app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), paymentsCtrl.webhook);

  // From here on, JSON body parsing is fine
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Per-route rate limiting (skipped in test env)
  app.use('/api/v1', apiLimiter);

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/restaurants', restaurantRoutes);
  app.use('/api/v1/menu-items', menuItemRoutes);
  app.use('/api/v1/cart', cartRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/reviews', reviewRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
