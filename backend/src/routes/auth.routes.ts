import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  createOfficer,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit.js';

export const authRouter = Router();

// Public Authentication
authRouter.post('/register', registerLimiter, register);
authRouter.post('/login', loginLimiter, login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);

// Authenticated User Profile
authRouter.get('/me', authenticate, getMe);

// Admin-only Officer Creation
authRouter.post('/officers', authenticate, authorize('admin'), createOfficer);
