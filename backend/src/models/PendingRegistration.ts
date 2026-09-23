import mongoose, { Document, Schema } from 'mongoose';

export interface IPendingRegistration extends Document {
  email: string;
  name: string;
  passwordHash: string;
  verificationCode: string;
  createdAt: Date;
  expiresAt: Date;
}

const PendingRegistrationSchema = new Schema<IPendingRegistration>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    verificationCode: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index: automatically deletes document when expiresAt timestamp passes
    },
  },
  { timestamps: false }
);

export const PendingRegistration = mongoose.model<IPendingRegistration>(
  'PendingRegistration',
  PendingRegistrationSchema
);
