import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'report_received'
  | 'status_changed'
  | 'message_received'
  | 'alert_published'
  | 'investigation_assigned'
  | 'new_incident';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  incidentId?: mongoose.Types.ObjectId;
  investigationId?: mongoose.Types.ObjectId;
  alertId?: mongoose.Types.ObjectId;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'report_received',
        'status_changed',
        'message_received',
        'alert_published',
        'investigation_assigned',
        'new_incident',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
    },
    investigationId: {
      type: Schema.Types.ObjectId,
      ref: 'Investigation',
    },
    alertId: {
      type: Schema.Types.ObjectId,
      ref: 'Alert',
    },
    link: {
      type: String,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);


NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);
