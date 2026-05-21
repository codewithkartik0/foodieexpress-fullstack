import 'express';
import type { Role } from '../utils/jwt';

declare global {
  namespace Express {
    interface UserPrincipal {
      id: string;
      role: Role;
      email: string;
    }
    interface Request {
      user?: UserPrincipal;
    }
  }
}

export {};
