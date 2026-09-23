import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'citizen' | 'officer' | 'admin';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
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
  emailVerificationCode?: string;
  emailVerificationExpires?: Date;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  profilePhoto?: string;
  badgeNumber?: string;
  department?: string;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never return password hash by default
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    familyPhone: {
      type: String,
      trim: true,
    },
    familyName: {
      type: String,
      trim: true,
    },
    familyRelation: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    bloodGroup: {
      type: String,
      trim: true,
    },
    medicalNotes: {
      type: String,
      trim: true,
    },
    emailVerificationCode: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    role: {
      type: String,
      enum: ['citizen', 'officer', 'admin'],
      default: 'citizen',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    profilePhoto: {
      type: String,
    },
    badgeNumber: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    lastLogin: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
