import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createUser,
  findUserByEmail,
  findUserById,
  comparePassword,
  handleFailedLogin,
  handleSuccessfulLogin,
  toSafeUser,
} from '../services/user.service.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/token.js';
import { env } from '../config/env.js';

// Validation schemas
const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(60),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const createOfficerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8),
  badgeNumber: z.string().min(1, 'Badge number is required'),
  department: z.string().min(1, 'Department is required'),
});

// Helper to set HTTP-only refresh cookie
function setRefreshCookie(res: Response, token: string): void {
  const isProd = env.NODE_ENV === 'production';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

// Helper to clear refresh cookie
function clearRefreshCookie(res: Response): void {
  const isProd = env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0].message,
      details: parseResult.error.format(),
    });
    return;
  }

  const { name, email, password } = parseResult.data;

  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    res.status(409).json({
      success: false,
      error: 'An account with this email address already exists.',
    });
    return;
  }

  // SECURITY: Public registration is strictly forced to 'citizen' role
  const newUser = await createUser({
    name,
    email,
    password,
    role: 'citizen',
  });

  const tokenPayload = {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    success: true,
    message: 'Account registered successfully',
    user: newUser,
    accessToken,
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0].message,
    });
    return;
  }

  const { email, password } = parseResult.data;
  const user = await findUserByEmail(email, true);

  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Invalid email or password.',
    });
    return;
  }

  const userId = user._id ? user._id.toString() : user.id;

  // Check account lockout
  if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
    const remainingMinutes = Math.ceil(
      (new Date(user.lockUntil).getTime() - Date.now()) / (60 * 1000)
    );
    res.status(423).json({
      success: false,
      error: `Account is temporarily locked due to excessive failed attempts. Please try again in ${remainingMinutes} minutes.`,
    });
    return;
  }

  // Verify password
  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    const { isLocked, lockUntil } = await handleFailedLogin(userId);
    if (isLocked && lockUntil) {
      res.status(423).json({
        success: false,
        error: 'Too many failed login attempts. Account has been temporarily locked for 30 minutes.',
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Invalid email or password.',
    });
    return;
  }

  if (user.isActive === false) {
    res.status(403).json({
      success: false,
      error: 'Your account has been disabled. Please contact system administration.',
    });
    return;
  }

  // Reset failed attempts on success
  await handleSuccessfulLogin(userId);

  const safeUser = toSafeUser(user);
  const tokenPayload = {
    userId: safeUser.id,
    email: safeUser.email,
    role: safeUser.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  setRefreshCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    user: safeUser,
    accessToken,
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    res.status(401).json({
      success: false,
      error: 'No refresh token provided.',
    });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await findUserById(payload.userId);

    if (!user || user.isActive === false) {
      clearRefreshCookie(res);
      res.status(401).json({
        success: false,
        error: 'User session invalid or user deactivated.',
      });
      return;
    }

    const safeUser = toSafeUser(user);
    const tokenPayload = {
      userId: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    setRefreshCookie(res, newRefreshToken);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      user: safeUser,
    });
  } catch (error: any) {
    clearRefreshCookie(res);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token. Please log in again.',
    });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  clearRefreshCookie(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated.' });
    return;
  }

  const user = await findUserById(req.user.id);
  if (!user) {
    res.status(404).json({ success: false, error: 'User account not found.' });
    return;
  }

  res.status(200).json({
    success: true,
    user: toSafeUser(user),
  });
}

// Admin-only creation of law-enforcement officer accounts
export async function createOfficer(req: Request, res: Response): Promise<void> {
  const parseResult = createOfficerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0].message,
    });
    return;
  }

  const { name, email, password, badgeNumber, department } = parseResult.data;

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    res.status(409).json({
      success: false,
      error: 'An account with this email address already exists.',
    });
    return;
  }

  const newOfficer = await createUser({
    name,
    email,
    password,
    role: 'officer',
    badgeNumber,
    department,
  });

  res.status(201).json({
    success: true,
    message: 'Law enforcement officer account created successfully.',
    user: newOfficer,
  });
}
