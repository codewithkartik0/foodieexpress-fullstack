import bcrypt from 'bcryptjs';
import { config } from '../config';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.bcryptCost);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d)[\S]{8,72}$/;

export function isStrongPassword(plain: string): boolean {
  return PASSWORD_POLICY.test(plain);
}
