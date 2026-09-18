import { Router } from 'express';
import {
  getInvestigationsController,
  getInvestigationDetailController,
  createInvestigationController,
  assignOfficerController,
  addInternalNoteController,
  updateInvestigationStatusController,
  getOfficersController,
} from '../controllers/investigation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';

export const investigationRouter = Router();

// Strict Security Barrier: All investigation routes require authentication AND officer/admin role.
// Ordinary citizens will receive 403 Forbidden.
investigationRouter.use(authenticate, authorize('officer', 'admin'));

// Available officers for assignment
investigationRouter.get('/officers', getOfficersController);

// List & Filter investigations (with status counters)
investigationRouter.get('/', getInvestigationsController);

// Initiate a new formal investigation for a verified incident
investigationRouter.post('/', createInvestigationController);

// Get detailed investigation case dossier
investigationRouter.get('/:id', getInvestigationDetailController);

// Assign or reassign lead officer & team
investigationRouter.patch('/:id/assign', assignOfficerController);

// Append confidential internal case note
investigationRouter.post('/:id/notes', addInternalNoteController);

// Update investigation case status or resolve with findings
investigationRouter.patch('/:id/status', updateInvestigationStatusController);
