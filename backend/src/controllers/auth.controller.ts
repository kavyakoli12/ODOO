import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { PendingRegistration } from '../models/PendingRegistration.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  comparePassword,
  hashPassword,
  handleFailedLogin,
  handleSuccessfulLogin,
  toSafeUser,
  getCitizens,
  setUserActiveStatus,
  updateUserProfile,
} from '../services/user.service.js';
import { sendVerificationEmail } from '../services/email.service.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/token.js';
import { env } from '../config/env.js';

// Validation schemas
const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60).optional(),
  phone: z.string().max(20).optional().nullable(),
  familyPhone: z.string().max(20).optional().nullable(),
  familyName: z.string().max(60).optional().nullable(),
  familyRelation: z.string().max(40).optional().nullable(),
  address: z.string().max(250).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(20).optional().nullable(),
  bloodGroup: z.string().max(10).optional().nullable(),
  medicalNotes: z.string().max(500).optional().nullable(),
});

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
function isSecureRequest(res: Response): boolean {
  if (env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production') return true;
  const req = res.req;
  if (!req) return false;
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

// Helper to set HTTP-only refresh cookie
function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isSecureRequest(res),
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

// Helper to clear refresh cookie
function clearRefreshCookie(res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isSecureRequest(res),
    sameSite: 'lax',
    path: '/',
  });
}

// In-memory fallback for pending registrations when MongoDB is offline
const memoryPendingRegistrations = new Map<string, any>();

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
  const normalizedEmail = email.trim().toLowerCase();

  // Check if a VERIFIED user already exists in the permanent database
  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser && existingUser.isEmailVerified) {
    res.status(409).json({
      success: false,
      error: 'An account with this email address already exists. Please sign in.',
    });
    return;
  }

  // If a legacy unverified user exists in the permanent User collection, clean it up so it never blocks
  if (existingUser && !existingUser.isEmailVerified) {
    if (mongoose.connection.readyState === 1) {
      await User.deleteOne({ _id: existingUser._id });
    }
  }

  // Generate 6-digit verification OTP code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  const passwordHash = await hashPassword(password);

  // DO NOT insert into primary User collection!
  // Store strictly in auto-expiring PendingRegistration collection
  if (mongoose.connection.readyState === 1) {
    await PendingRegistration.findOneAndUpdate(
      { email: normalizedEmail },
      {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        verificationCode,
        expiresAt,
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );
  } else {
    memoryPendingRegistrations.set(normalizedEmail, {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      verificationCode,
      expiresAt,
    });
  }

  // Send real verification email via Gmail SMTP
  const emailResult = await sendVerificationEmail(normalizedEmail, name.trim(), verificationCode);

  res.status(201).json({
    success: true,
    message: emailResult.success
      ? 'Verification code sent to your email. Please check your inbox.'
      : 'Account registration initiated. Please enter the 6-digit code sent to your email.',
    requiresVerification: true,
    email: normalizedEmail,
    emailSent: emailResult.success,
  });
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const parseResult = verifyEmailSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0].message,
    });
    return;
  }

  const { email, code } = parseResult.data;
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Look up the pending registration
  let pending: any = null;
  if (mongoose.connection.readyState === 1) {
    pending = await PendingRegistration.findOne({ email: normalizedEmail });
  } else {
    pending = memoryPendingRegistrations.get(normalizedEmail);
  }

  if (!pending) {
    // Check if account was already verified and exists in User collection
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser && existingUser.isEmailVerified) {
      const safeUser = toSafeUser(existingUser);
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
        message: 'Account is already verified. Signed in successfully.',
        user: safeUser,
        accessToken,
      });
      return;
    }

    res.status(404).json({
      success: false,
      error: 'No pending registration found for this email, or the code has expired. Please register again.',
    });
    return;
  }

  // 2. Check expiration
  if (pending.expiresAt && new Date(pending.expiresAt) < new Date()) {
    if (mongoose.connection.readyState === 1) {
      await PendingRegistration.deleteOne({ email: normalizedEmail });
    } else {
      memoryPendingRegistrations.delete(normalizedEmail);
    }
    res.status(400).json({
      success: false,
      error: 'Verification code has expired. Please register again to receive a fresh code.',
    });
    return;
  }

  // 3. Verify OTP code
  if (!pending.verificationCode || pending.verificationCode !== code.trim()) {
    res.status(400).json({
      success: false,
      error: 'Invalid 6-digit verification code. Please check your email.',
    });
    return;
  }

  // 4. Verification successful! NOW AND ONLY NOW insert the verified user into the database!
  let newUser: any = null;
  if (mongoose.connection.readyState === 1) {
    // Ensure clean state: purge any residual unverified record
    await User.deleteMany({ email: normalizedEmail, isEmailVerified: false });

    newUser = await User.create({
      name: pending.name,
      email: normalizedEmail,
      passwordHash: pending.passwordHash,
      role: 'citizen',
      isEmailVerified: true,
      isActive: true,
      loginAttempts: 0,
    });

    // Delete the pending registration record
    await PendingRegistration.deleteOne({ _id: pending._id });
  } else {
    newUser = await createUser({
      name: pending.name,
      email: normalizedEmail,
      password: 'dummy_handled_in_memory',
      role: 'citizen',
      isEmailVerified: true,
    });
    memoryPendingRegistrations.delete(normalizedEmail);
  }

  const safeUser = toSafeUser(newUser);
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
    message: 'Email verified successfully! Welcome to Trinetra.',
    user: safeUser,
    accessToken,
  });
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  const parseResult = resendVerificationSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0].message,
    });
    return;
  }

  const { email } = parseResult.data;
  const normalizedEmail = email.trim().toLowerCase();

  // If already verified in permanent User collection, inform user
  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser && existingUser.isEmailVerified) {
    res.status(200).json({
      success: true,
      message: 'This email account is already verified. Please sign in.',
    });
    return;
  }

  // Look up pending registration
  let pending: any = null;
  if (mongoose.connection.readyState === 1) {
    pending = await PendingRegistration.findOne({ email: normalizedEmail });
  } else {
    pending = memoryPendingRegistrations.get(normalizedEmail);
  }

  if (!pending) {
    res.status(404).json({
      success: false,
      error: 'No pending registration found for this email. Please register first.',
    });
    return;
  }

  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  if (mongoose.connection.readyState === 1) {
    pending.verificationCode = newCode;
    pending.expiresAt = expiresAt;
    await pending.save();
  } else {
    pending.verificationCode = newCode;
    pending.expiresAt = expiresAt;
    memoryPendingRegistrations.set(normalizedEmail, pending);
  }

  const emailResult = await sendVerificationEmail(normalizedEmail, pending.name, newCode);

  res.status(200).json({
    success: true,
    message: emailResult.success
      ? 'A new 6-digit verification code has been dispatched to your email.'
      : 'Failed to dispatch email. Please check configuration.',
    emailSent: emailResult.success,
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

export async function updateProfile(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated.' });
    return;
  }

  const parseResult = updateProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0].message,
      details: parseResult.error.format(),
    });
    return;
  }

  try {
    const updatedUser = await updateUserProfile(req.user.id, parseResult.data);
    if (!updatedUser) {
      res.status(404).json({ success: false, error: 'User account not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to update profile information.',
    });
  }
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

// Admin: Get list of registered citizens
export async function getCitizensController(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Administrative clearance required.' });
    return;
  }

  try {
    const citizens = await getCitizens();
    res.status(200).json({
      success: true,
      count: citizens.length,
      data: citizens,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve registered citizens.',
    });
  }
}

// Admin: Dismiss / Toggle Active Status for Officer or Citizen
export async function updateUserStatusController(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Administrative clearance required.' });
    return;
  }

  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    res.status(400).json({
      success: false,
      error: 'Invalid isActive boolean value.',
    });
    return;
  }

  // Prevent admin from deactivating themselves
  if (id === req.user.id && !isActive) {
    res.status(400).json({
      success: false,
      error: 'Administrators cannot dismiss their own active account.',
    });
    return;
  }

  try {
    const updated = await setUserActiveStatus(id, isActive);
    if (!updated) {
      res.status(404).json({
        success: false,
        error: 'User not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: isActive ? 'User access restored.' : 'User dismissed and platform access revoked.',
      user: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to update user status.',
    });
  }
}

