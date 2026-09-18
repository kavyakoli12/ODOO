import type { Incident } from './incident';

export type InvestigationStatus = 'open' | 'active' | 'suspended' | 'closed';
export type InvestigationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface InternalNote {
  id: string;
  authorId: string;
  authorName: string;
  authorBadge?: string;
  content: string;
  createdAt: string;
}

export interface InvestigationTimelineEntry {
  id: string;
  action: string;
  description: string;
  officerId: string;
  officerName: string;
  createdAt: string;
}

export interface Investigation {
  id: string;
  caseNumber: string;
  incidentIds: string[];
  title: string;
  description: string;
  status: InvestigationStatus;
  priority: InvestigationPriority;
  leadOfficerId: string;
  leadOfficerName: string;
  teamMemberIds: string[];
  internalNotes: InternalNote[];
  timeline: InvestigationTimelineEntry[];
  resolutionNotes?: string;
  closedAt?: string;
  closedBy?: string;
  incident?: Incident | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationStats {
  totalCases: number;
  openCases: number;
  activeCases: number;
  suspendedCases: number;
  closedCases: number;
  criticalCases: number;
}

export interface OfficerUser {
  id: string;
  name: string;
  email: string;
  role: string;
  badgeNumber?: string;
  department?: string;
}

export interface CreateInvestigationPayload {
  incidentId: string;
  title: string;
  description: string;
  priority?: InvestigationPriority;
  leadOfficerId?: string;
  initialNote?: string;
}

export interface AssignOfficerPayload {
  leadOfficerId: string;
  teamMemberIds?: string[];
}

export interface AddNotePayload {
  content: string;
}

export interface UpdateStatusPayload {
  status: InvestigationStatus;
  resolutionNotes?: string;
}
