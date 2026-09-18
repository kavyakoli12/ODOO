import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.js';
import { findUserById } from '../services/user.service.js';
import type { UserRole } from '../models/User.js';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. No Bearer token provided in Authorization header.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await findUserById(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User account no longer exists.',
      });
      return;
    }

    if (user.isActive === false) {
      res.status(403).json({
        success: false,
        error: 'User account has been deactivated by an administrator.',
      });
      return;
    }

    req.user = {
      id: user._id ? user._id.toString() : user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: error.message || 'Invalid or expired access token.',
    });
  }
}
