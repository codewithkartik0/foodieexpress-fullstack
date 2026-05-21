import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import type { Express } from 'express';

let mongo: MongoMemoryServer | null = null;
let app: Express | null = null;

export async function setupTestDb(): Promise<{ app: Express; uri: string }> {
  if (!mongo) {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    process.env.MONGODB_URI = uri;
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-for-jest-32-bytes-min';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-jest-32-bytes-min';
    process.env.BCRYPT_COST = '4'; // fast for tests
    process.env.STRIPE_SECRET_KEY = '';
    process.env.SMTP_HOST = '';
    await mongoose.connect(uri);
    app = createApp();
  }
  return { app: app!, uri: mongo.getUri() };
}

export async function teardownTestDb(): Promise<void> {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
    mongo = null;
  }
  app = null;
}

export async function clearAllCollections(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}
