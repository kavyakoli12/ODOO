import type { IncidentStatus } from './incident';

export interface SafeMapIncident {
  id: string;
  trackingId: string;
  title: string;
  shortDescription: string;
  categoryName: string;
  categorySlug: string;
  categoryColor: string;
  categoryIcon: string;
  status: IncidentStatus;
  isVerified: boolean;
  isCitizenReport: boolean;
  severity: number;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  approximateAddress: string;
  incidentDate: string;
  createdAt: string;
}

export interface MapFilterState {
  category: string;
  status: string;
  timeRange: string;
  searchQuery: string;
}

export interface MapBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}
