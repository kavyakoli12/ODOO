export type IncidentStatus =
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'assigned'
  | 'investigation_ongoing'
  | 'resolved';

export interface IncidentCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
}

export interface StatusHistoryItem {
  id: string;
  incidentId: string;
  previousStatus: string;
  newStatus: string;
  changedByRole: string;
  reason?: string;
  note?: string;
  createdAt: string;
}

export interface EvidenceItem {
  id: string;
  incidentId: string;
  fileUrl: string;
  originalFilename: string;
  mimeType: string;
  fileSizeMB: number;
  uploadedAt: string;
}

export interface Incident {
  id: string;
  _id?: string;
  trackingId: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  status: IncidentStatus;
  severity: number;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: string;
  incidentDate: string;
  isAnonymous: boolean;
  reporterId?: string;
  reporterName?: string;
  evidenceCount: number;
  statusHistory?: StatusHistoryItem[];
  evidence?: EvidenceItem[];
  rejectionReason?: string;
  investigationId?: string;
  resolutionSummary?: string;
  createdAt: string;
  updatedAt: string;
}


export interface CreateIncidentInput {
  title: string;
  description: string;
  categorySlug: string;
  severity: number;
  latitude: number;
  longitude: number;
  address: string;
  incidentDate?: string;
  isAnonymous?: boolean;
}
