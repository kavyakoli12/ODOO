import mongoose, { Document, Schema } from 'mongoose';

export interface IIncidentCategory extends Document {
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon: string;
  markerIcon?: string;
  isActive: boolean;
  displayOrder: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentCategorySchema = new Schema<IIncidentCategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      default: '#4F46E5', // Indigo default
    },
    icon: {
      type: String,
      default: 'AlertTriangle',
    },
    markerIcon: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const IncidentCategory = mongoose.model<IIncidentCategory>(
  'IncidentCategory',
  IncidentCategorySchema
);
