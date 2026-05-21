import mongoose from 'mongoose';
import { config } from './index';
import { logger } from './logger';

mongoose.set('strictQuery', true);

export async function connectMongo(uri: string = config.mongoUri): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: !config.isProd,
      serverSelectionTimeoutMS: 10_000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    logger.error('Failed to connect to MongoDB', err as Error);
    throw err;
  }
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
