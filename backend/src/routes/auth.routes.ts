import { Router } from 'express';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  createOfficer,
  getCitizensController,
  updateUserStatusController,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit.js';

export const authRouter = Router();

// Public Authentication
authRouter.post('/register', registerLimiter, register);
authRouter.post('/verify-email', verifyEmail);
authRouter.post('/resend-verification', registerLimiter, resendVerification);
authRouter.post('/login', loginLimiter, login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);

// Authenticated User Profile
authRouter.get('/me', authenticate, getMe);
authRouter.put('/profile', authenticate, updateProfile);

// Admin-only User & Officer Management
authRouter.post('/officers', authenticate, authorize('admin'), createOfficer);
authRouter.get('/citizens', authenticate, authorize('admin'), getCitizensController);
authRouter.patch('/users/:id/status', authenticate, authorize('admin'), updateUserStatusController);

