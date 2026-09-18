import mongoose, { Document, Schema } from 'mongoose';

export interface IStatusHistory extends Document {
  incidentId: mongoose.Types.ObjectId;
  investigationId?: mongoose.Types.ObjectId;
  previousStatus: string;
  newStatus: string;
  changedBy: mongoose.Types.ObjectId;
  changedByRole: string;
  reason?: string;
  note?: string;
  createdAt: Date;
}

const StatusHistorySchema = new Schema<IStatusHistory>(
  {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true,
    },
    investigationId: {
      type: Schema.Types.ObjectId,
      ref: 'Investigation',
    },
    previousStatus: {
      type: String,
      required: true,
    },
    newStatus: {
      type: String,
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedByRole: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

StatusHistorySchema.index({ incidentId: 1, createdAt: -1 });

export const StatusHistory = mongoose.model<IStatusHistory>(
  'StatusHistory',
  StatusHistorySchema
);
