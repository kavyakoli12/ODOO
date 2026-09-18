import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  incidentId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: string; // 'citizen' | 'officer' | 'admin'
  senderName: string;
  content: string;
  isInternalNote: boolean; // true = officer-only, never exposed to citizen
  readAt?: Date;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    isInternalNote: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

MessageSchema.index({ incidentId: 1, isInternalNote: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
