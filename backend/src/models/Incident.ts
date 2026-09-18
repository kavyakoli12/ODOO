import mongoose, { Document, Schema } from 'mongoose';

export type IncidentStatus =
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'assigned'
  | 'investigation_ongoing'
  | 'resolved';

export interface IIncident extends Document {
  trackingId: string;
  title: string;
  description: string;
  categoryId: mongoose.Types.ObjectId;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  status: IncidentStatus;
  severity: number; // 1 - 5
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: string;
  neighborhood?: string;
  city?: string;
  incidentDate: Date;
  isAnonymous: boolean;
  reporterId?: mongoose.Types.ObjectId;
  reporterName?: string;
  assignedOfficerId?: mongoose.Types.ObjectId;
  investigationId?: mongoose.Types.ObjectId;
  isPublic: boolean; // Only true once verified
  aiCategorySuggestion?: string;
  aiPriorityScore?: number;
  duplicateOf?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  resolutionSummary?: string;
  evidenceCount: number;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncident>(
  {
    trackingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'IncidentCategory',
      required: true,
      index: true,
    },
    categoryName: {
      type: String,
      required: true,
    },
    categoryColor: {
      type: String,
      default: '#4F46E5',
    },
    categoryIcon: {
      type: String,
      default: 'AlertTriangle',
    },
    status: {
      type: String,
      enum: [
        'submitted',
        'under_review',
        'verified',
        'rejected',
        'assigned',
        'investigation_ongoing',
        'resolved',
      ],
      default: 'submitted',
      index: true,
    },
    severity: {
      type: Number,
      min: 1,
      max: 5,
      default: 2,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    neighborhood: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    incidentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    reporterName: {
      type: String,
    },
    assignedOfficerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    investigationId: {
      type: Schema.Types.ObjectId,
      ref: 'Investigation',
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    aiCategorySuggestion: {
      type: String,
    },
    aiPriorityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    duplicateOf: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    resolutionSummary: {
      type: String,
      trim: true,
    },
    evidenceCount: {
      type: Number,
      default: 0,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index on location coordinates for map & radius queries
IncidentSchema.index({ location: '2dsphere' });
// Compound index for officer queue sorting
IncidentSchema.index({ status: 1, createdAt: -1 });
// Compound index for citizen's "my reports" queries
IncidentSchema.index({ reporterId: 1, status: 1 });

export const Incident = mongoose.model<IIncident>('Incident', IncidentSchema);
