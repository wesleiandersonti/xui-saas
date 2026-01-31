import type { Request } from 'express';
import type { AuthUser } from '../../modules/auth/auth.types';

export interface RequestWithUser extends Request {
  user: AuthUser;
}
