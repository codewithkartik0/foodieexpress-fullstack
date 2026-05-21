import morgan, { StreamOptions } from 'morgan';
import { logger } from '../config/logger';
import { config } from '../config';

const stream: StreamOptions = {
  write: (message: string) => logger.http?.(message.trim()) ?? logger.info(message.trim()),
};

export const requestLogger = morgan(config.isProd ? 'combined' : 'dev', {
  stream,
  skip: () => config.isTest,
});
