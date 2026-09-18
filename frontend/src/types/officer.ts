import type { Incident } from './incident';

export interface OfficerQueueStats {
  newSubmitted: number;
  underReview: number;
  verified: number;
  rejected: number;
  totalActive: number;
}

export interface OfficerQueueFilters {
  status: string;
  category: string;
  severity: number;
  searchQuery: string;
  sortBy: string;
}

export interface OfficerReviewPayload {
  action: 'start_review' | 'verify' | 'reject';
  note?: string;
  reason?: string;
}

export interface OfficerQueueResponse {
  success: boolean;
  stats: OfficerQueueStats;
  count: number;
  data: Incident[];
}
