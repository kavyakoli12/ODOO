import mongoose, { Document, Schema } from 'mongoose';

export type InvestigationStatus = 'open' | 'active' | 'suspended' | 'closed';
export type InvestigationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface IInternalNote {
  id?: string;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorBadge?: string;
  content: string;
  createdAt: Date;
}

export interface ITimelineEntry {
  id?: string;
  action: string;
  description: string;
  officerId: mongoose.Types.ObjectId;
  officerName: string;
  createdAt: Date;
}

export interface IInvestigation extends Document {
  caseNumber: string;
  incidentIds: mongoose.Types.ObjectId[];
  title: string;
  description: string;
  status: InvestigationStatus;
  priority: InvestigationPriority;
  leadOfficerId: mongoose.Types.ObjectId;
  leadOfficerName?: string;
  teamMemberIds: mongoose.Types.ObjectId[];
  internalNotes: IInternalNote[];
  timeline: ITimelineEntry[];
  resolutionNotes?: string;
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvestigationSchema = new Schema<IInvestigation>(
  {
    caseNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    incidentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Incident',
      },
    ],
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'active', 'suspended', 'closed'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
      index: true,
    },
    leadOfficerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    leadOfficerName: {
      type: String,
      trim: true,
    },
    teamMemberIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    internalNotes: [
      {
        authorId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        authorName: {
          type: String,
          required: true,
        },
        authorBadge: {
          type: String,
        },
        content: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    timeline: [
      {
        action: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        officerId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        officerName: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resolutionNotes: {
      type: String,
      trim: true,
    },
    closedAt: {
      type: Date,
    },
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

InvestigationSchema.index({ leadOfficerId: 1, status: 1 });

export const Investigation = mongoose.model<IInvestigation>(
  'Investigation',
  InvestigationSchema
);

