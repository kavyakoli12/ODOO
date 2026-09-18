import mongoose, { Document, Schema } from 'mongoose';

export type AlertSeverity = 'info' | 'warning' | 'danger';
export type AlertType = 'safety_warning' | 'missing_person' | 'major_incident' | 'area_warning' | 'emergency_info';
export type AlertScopeType = 'city_wide' | 'radius';

export interface IAlert extends Document {
  title: string;
  description: string;
  severity: AlertSeverity;
  alertType: AlertType;
  geographicScope: {
    type: AlertScopeType;
    center?: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
    radiusKm?: number;
    cityName?: string;
  };
  isActive: boolean;
  startsAt: Date;
  expiresAt: Date;
  publishedBy: mongoose.Types.ObjectId;
  publishedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const PointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
    },
  },
  { _id: false }
);

const AlertSchema = new Schema<IAlert>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'danger'],
      default: 'warning',
    },
    alertType: {
      type: String,
      enum: ['safety_warning', 'missing_person', 'major_incident', 'area_warning', 'emergency_info'],
      default: 'safety_warning',
    },
    geographicScope: {
      type: {
        type: String,
        enum: ['city_wide', 'radius'],
        default: 'city_wide',
      },
      center: {
        type: PointSchema,
        required: false,
        default: undefined,
      },
      radiusKm: {
        type: Number,
      },
      cityName: {
        type: String,
        trim: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    startsAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishedByName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

AlertSchema.index({ 'geographicScope.center': '2dsphere' }, { sparse: true });
AlertSchema.index({ isActive: 1, expiresAt: 1 });

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);

