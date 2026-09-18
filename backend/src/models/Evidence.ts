import mongoose, { Document, Schema } from 'mongoose';

export type EvidenceVisibility = 'private' | 'officer_only' | 'public';

export interface IEvidence extends Document {
  incidentId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  uploaderRole: string;
  fileUrl: string;
  filePublicId?: string;
  originalFilename: string;
  mimeType: string;
  fileSizeMB: number;
  isVisible: EvidenceVisibility;
  description?: string;
  uploadedAt: Date;
}

const EvidenceSchema = new Schema<IEvidence>(
  {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    uploaderRole: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    filePublicId: {
      type: String,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSizeMB: {
      type: Number,
      required: true,
    },
    isVisible: {
      type: String,
      enum: ['private', 'officer_only', 'public'],
      default: 'officer_only',
    },
    description: {
      type: String,
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

export const Evidence = mongoose.model<IEvidence>('Evidence', EvidenceSchema);
