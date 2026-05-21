import { createApp } from './app';
import { config } from './config';
import { connectMongo, disconnectMongo } from './config/db';
import { logger } from './config/logger';

async function main(): Promise<void> {
  await connectMongo();
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`FoodieExpress API listening on port ${config.port} (env=${config.env})`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await disconnectMongo();
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', err);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason as Error);
  });
}

main().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
