import mongoose, { Document, Schema } from 'mongoose';

export type EscortStatus = 'monitoring' | 'stoppage_warning' | 'distress' | 'completed' | 'cancelled';

export interface EscortBreadcrumb {
  coordinates: [number, number]; // [lng, lat]
  timestamp: Date;
  speed?: number; // km/h
}

export interface ISafeEscortSession extends Document {
  sessionId: string;
  userId?: mongoose.Types.ObjectId;
  citizenName: string;
  contactPhone?: string;
  zoneId: string;
  zoneName: string;
  centerCoordinates: [number, number]; // [lng, lat]
  zoneRadiusMeters: number;
  currentCoordinates: [number, number]; // [lng, lat]
  status: EscortStatus;
  lastMovementAt: Date;
  startedAt: Date;
  endedAt?: Date;
  breadcrumbs: EscortBreadcrumb[];
  officerNotes?: string;
  dispatchedUnit?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EscortBreadcrumbSchema = new Schema(
  {
    coordinates: {
      type: [Number],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    speed: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const SafeEscortSessionSchema = new Schema<ISafeEscortSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    citizenName: {
      type: String,
      default: 'Anonymous Citizen',
      trim: true,
    },
    contactPhone: {
      type: String,
      default: '',
    },
    zoneId: {
      type: String,
      required: true,
      index: true,
    },
    zoneName: {
      type: String,
      required: true,
    },
    centerCoordinates: {
      type: [Number],
      required: true,
    },
    zoneRadiusMeters: {
      type: Number,
      default: 1000,
    },
    currentCoordinates: {
      type: [Number],
      required: true,
    },
    status: {
      type: String,
      enum: ['monitoring', 'stoppage_warning', 'distress', 'completed', 'cancelled'],
      default: 'monitoring',
      index: true,
    },
    lastMovementAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    breadcrumbs: {
      type: [EscortBreadcrumbSchema],
      default: [],
    },
    officerNotes: {
      type: String,
      default: '',
    },
    dispatchedUnit: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index on currentCoordinates for quick proximity search
SafeEscortSessionSchema.index({ currentCoordinates: '2dsphere' });

export const SafeEscortSession = mongoose.model<ISafeEscortSession>(
  'SafeEscortSession',
  SafeEscortSessionSchema
);
