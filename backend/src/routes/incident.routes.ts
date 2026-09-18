import { Router } from 'express';
import {
  getCategoriesController,
  createIncidentController,
  getMyIncidentsController,
  getIncidentByIdController,
  uploadEvidenceController,
  getMapIncidentsController,
  getOfficerQueueController,
  getOfficerIncidentDetailController,
  reviewIncidentController,
} from '../controllers/incident.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { evidenceUpload } from '../middleware/upload.js';

export const incidentRouter = Router();

// Public Map Incidents Endpoint (with privacy anonymization)
incidentRouter.get('/map', getMapIncidentsController);

// Public / Authenticated category listing
incidentRouter.get('/categories', getCategoriesController);

// Authority Incident Triage Queue & Review Actions (Officer & Admin only)
incidentRouter.get(
  '/officer/queue',
  authenticate,
  authorize('officer', 'admin'),
  getOfficerQueueController
);
incidentRouter.get(
  '/officer/:id',
  authenticate,
  authorize('officer', 'admin'),
  getOfficerIncidentDetailController
);
incidentRouter.post(
  '/officer/:id/review',
  authenticate,
  authorize('officer', 'admin'),
  reviewIncidentController
);

// Citizen Incident Management
incidentRouter.post('/', authenticate, createIncidentController);
incidentRouter.get('/mine', authenticate, getMyIncidentsController);
incidentRouter.get('/:id', authenticate, getIncidentByIdController);
incidentRouter.post(
  '/:id/evidence',
  authenticate,
  evidenceUpload.single('file'),
  uploadEvidenceController
);
