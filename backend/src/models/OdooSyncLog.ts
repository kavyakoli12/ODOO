import mongoose, { Document, Schema } from 'mongoose';

export type OdooSyncStatus = 'pending' | 'synced' | 'failed';

export interface IOdooSyncLog extends Document {
  incidentId: mongoose.Types.ObjectId;
  odooTicketId?: number;
  odooTicketRef?: string;
  syncStatus: OdooSyncStatus;
  lastSyncAt?: Date;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const OdooSyncLogSchema = new Schema<IOdooSyncLog>(
  {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      unique: true,
      index: true,
    },
    odooTicketId: {
      type: Number,
    },
    odooTicketRef: {
      type: String,
      trim: true,
    },
    syncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed'],
      default: 'pending',
      index: true,
    },
    lastSyncAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const OdooSyncLog = mongoose.model<IOdooSyncLog>(
  'OdooSyncLog',
  OdooSyncLogSchema
);
