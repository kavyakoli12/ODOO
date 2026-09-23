import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, IUser, UserRole } from '../models/User.js';

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  phone?: string;
  familyPhone?: string;
  familyName?: string;
  familyRelation?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bloodGroup?: string;
  medicalNotes?: string;
  badgeNumber?: string;
  department?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  badgeNumber?: string;
  department?: string;
  phone?: string;
  isEmailVerified?: boolean;
  emailVerificationCode?: string;
  emailVerificationExpires?: Date;
}

// Memory fallback store when MongoDB is not connected
const memoryUsers = new Map<string, any>();

function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function toSafeUser(user: any): SafeUser {
  return {
    id: user._id ? user._id.toString() : user.id,
    name: user.name,
    email: user.email.toLowerCase(),
    role: user.role,
    isActive: user.isActive ?? true,
    isEmailVerified: user.isEmailVerified ?? false,
    phone: user.phone || '',
    familyPhone: user.familyPhone || '',
    familyName: user.familyName || '',
    familyRelation: user.familyRelation || '',
    address: user.address || '',
    city: user.city || '',
    state: user.state || '',
    pincode: user.pincode || '',
    bloodGroup: user.bloodGroup || '',
    medicalNotes: user.medicalNotes || '',
    badgeNumber: user.badgeNumber,
    department: user.department,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt || new Date(),
    updatedAt: user.updatedAt || new Date(),
  };
}

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export async function findUserByEmail(email: string, includePassword = false): Promise<any | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (isMongoConnected()) {
    const query = User.findOne({ email: normalizedEmail });
    if (includePassword) {
      query.select('+passwordHash');
    }
    return query.exec();
  }

  // Memory fallback
  for (const user of memoryUsers.values()) {
    if (user.email.toLowerCase() === normalizedEmail) {
      return user;
    }
  }
  return null;
}

export async function findUserById(id: string, includePassword = false): Promise<any | null> {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const query = User.findById(id);
    if (includePassword) {
      query.select('+passwordHash');
    }
    return query.exec();
  }

  // Memory fallback
  return memoryUsers.get(id) || null;
}

export async function createUser(data: CreateUserData): Promise<SafeUser> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const passwordHash = await hashPassword(data.password);
  const now = new Date();

  const isEmailVerified = data.isEmailVerified !== undefined ? data.isEmailVerified : true;

  if (isMongoConnected()) {
    const newUser = await User.create({
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: data.role || 'citizen',
      badgeNumber: data.badgeNumber,
      department: data.department,
      phone: data.phone,
      isActive: true,
      isEmailVerified,
      emailVerificationCode: data.emailVerificationCode,
      emailVerificationExpires: data.emailVerificationExpires,
      loginAttempts: 0,
    });
    return toSafeUser(newUser);
  }

  // Memory fallback
  const id = new mongoose.Types.ObjectId().toString();
  const memUser = {
    _id: id,
    id,
    name: data.name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: data.role || 'citizen',
    badgeNumber: data.badgeNumber,
    department: data.department,
    phone: data.phone,
    isActive: true,
    isEmailVerified,
    emailVerificationCode: data.emailVerificationCode,
    emailVerificationExpires: data.emailVerificationExpires,
    loginAttempts: 0,
    createdAt: now,
    updatedAt: now,
  };
  memoryUsers.set(id, memUser);
  return toSafeUser(memUser);
}

export async function updateUserProfile(userId: string, data: Partial<any>): Promise<SafeUser | null> {
  if (isMongoConnected()) {
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: data },
      { new: true, runValidators: true }
    ).exec();
    return updated ? toSafeUser(updated) : null;
  }

  // Memory fallback
  for (const [key, user] of memoryUsers.entries()) {
    const id = user._id ? user._id.toString() : user.id;
    if (id === userId) {
      Object.assign(user, data, { updatedAt: new Date() });
      memoryUsers.set(key, user);
      return toSafeUser(user);
    }
  }
  return null;
}

export async function handleFailedLogin(userId: string): Promise<{ isLocked: boolean; lockUntil?: Date }> {
  const now = new Date();

  if (isMongoConnected()) {
    const user = await User.findById(userId);
    if (!user) return { isLocked: false };

    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
    }
    await user.save();
    return {
      isLocked: !!(user.lockUntil && user.lockUntil > now),
      lockUntil: user.lockUntil,
    };
  }

  // Memory fallback
  const user = memoryUsers.get(userId);
  if (!user) return { isLocked: false };

  user.loginAttempts = (user.loginAttempts || 0) + 1;
  if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    user.lockUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
  }
  user.updatedAt = now;
  return {
    isLocked: !!(user.lockUntil && user.lockUntil > now),
    lockUntil: user.lockUntil,
  };
}

export async function handleSuccessfulLogin(userId: string): Promise<void> {
  const now = new Date();

  if (isMongoConnected()) {
    await User.findByIdAndUpdate(userId, {
      loginAttempts: 0,
      lockUntil: undefined,
      lastLogin: now,
    });
    return;
  }

  // Memory fallback
  const user = memoryUsers.get(userId);
  if (user) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = now;
    user.updatedAt = now;
  }
}

// Seed development demo accounts
export async function seedDemoUsers(): Promise<void> {
  const demoAccounts: CreateUserData[] = [
    {
      name: 'Jane Citizen',
      email: 'citizen@demo.com',
      password: 'Demo@1234',
      role: 'citizen',
    },
    {
      name: 'Officer Alex Miller',
      email: 'officer@demo.com',
      password: 'Demo@1234',
      role: 'officer',
      badgeNumber: 'LE-9042',
      department: 'Metropolitan Police Dept',
    },
    {
      name: 'System Administrator',
      email: 'admin@demo.com',
      password: 'Demo@1234',
      role: 'admin',
    },
  ];

  for (const account of demoAccounts) {
    const existing = await findUserByEmail(account.email);
    if (!existing) {
      await createUser(account);
      const roleLabel = (account.role || 'citizen').toUpperCase();
      console.log(`👤 Seeded demo user: [${roleLabel}] ${account.email}`);
    }
  }
}

export async function getOfficers(): Promise<SafeUser[]> {
  if (isMongoConnected()) {
    const users = await User.find({ role: { $in: ['officer', 'admin'] } }).sort({ createdAt: -1 }).exec();
    return users.map((u) => toSafeUser(u));
  }

  // Memory fallback
  await seedDemoUsers();
  const list: SafeUser[] = [];
  for (const user of memoryUsers.values()) {
    if (user.role === 'officer' || user.role === 'admin') {
      list.push(toSafeUser(user));
    }
  }
  return list;
}

export async function getCitizens(): Promise<SafeUser[]> {
  if (isMongoConnected()) {
    const users = await User.find({ role: 'citizen' }).sort({ createdAt: -1 }).exec();
    return users.map((u) => toSafeUser(u));
  }

  // Memory fallback
  await seedDemoUsers();
  const list: SafeUser[] = [];
  for (const user of memoryUsers.values()) {
    if (user.role === 'citizen') {
      list.push(toSafeUser(user));
    }
  }
  return list;
}

export async function setUserActiveStatus(userId: string, isActive: boolean): Promise<SafeUser | null> {
  if (isMongoConnected()) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive } },
      { new: true }
    ).exec();
    return user ? toSafeUser(user) : null;
  }

  // Memory fallback
  for (const [email, user] of memoryUsers.entries()) {
    const id = user._id ? user._id.toString() : user.id;
    if (id === userId) {
      user.isActive = isActive;
      memoryUsers.set(email, user);
      return toSafeUser(user);
    }
  }
  return null;
}


