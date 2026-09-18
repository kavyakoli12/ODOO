import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../models/User.js';

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required prior to authorization check.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access forbidden: Requires one of [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'`,
      });
      return;
    }

    next();
  };
}
