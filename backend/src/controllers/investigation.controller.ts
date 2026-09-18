import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createInvestigation,
  getInvestigations,
  getInvestigationById,
  assignOfficer,
  addInternalNote,
  updateInvestigationStatus,
} from '../services/investigation.service.js';
import { getOfficers } from '../services/user.service.js';

const createInvestigationSchema = z.object({
  incidentId: z.string().min(1, 'Linked incident ID is required'),
  title: z
    .string()
    .min(3, 'Investigation title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string()
    .min(5, 'Investigation description must be at least 5 characters')
    .max(3000, 'Description cannot exceed 3000 characters'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  leadOfficerId: z.string().optional(),
  initialNote: z.string().optional(),
});

const assignOfficerSchema = z.object({
  leadOfficerId: z.string().min(1, 'Lead officer ID is required'),
  teamMemberIds: z.array(z.string()).optional(),
});

const addNoteSchema = z.object({
  content: z
    .string()
    .min(1, 'Note content cannot be empty')
    .max(3000, 'Note content cannot exceed 3000 characters'),
});

const updateStatusSchema = z.object({
  status: z.enum(['open', 'active', 'suspended', 'closed']),
  resolutionNotes: z.string().optional(),
});

export async function getOfficersController(_req: Request, res: Response): Promise<void> {
  const officers = await getOfficers();
  res.status(200).json({
    success: true,
    data: officers,
  });
}

export async function getInvestigationsController(req: Request, res: Response): Promise<void> {
  const { status, priority, searchQuery, officerId } = req.query;

  const result = await getInvestigations({
    status: status as string,
    priority: priority as string,
    searchQuery: searchQuery as string,
    officerId: officerId as string,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function getInvestigationDetailController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const investigation = await getInvestigationById(id);
  if (!investigation) {
    res.status(404).json({
      success: false,
      error: 'Investigation record not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: investigation,
  });
}

export async function createInvestigationController(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const parseResult = createInvestigationSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0].message,
      details: parseResult.error.format(),
    });
    return;
  }

  try {
    const investigation = await createInvestigation(parseResult.data, req.user);
    res.status(201).json({
      success: true,
      message: 'Investigation initiated successfully',
      data: investigation,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate investigation',
    });
  }
}

export async function assignOfficerController(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { id } = req.params;
  const parseResult = assignOfficerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0].message,
    });
    return;
  }

  const updated = await assignOfficer(id, parseResult.data, req.user);
  if (!updated) {
    res.status(404).json({
      success: false,
      error: 'Investigation record not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Investigating officer assigned successfully',
    data: updated,
  });
}

export async function addInternalNoteController(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { id } = req.params;
  const parseResult = addNoteSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0].message,
    });
    return;
  }

  const updated = await addInternalNote(id, parseResult.data, req.user);
  if (!updated) {
    res.status(404).json({
      success: false,
      error: 'Investigation record not found',
    });
    return;
  }

  res.status(201).json({
    success: true,
    message: 'Confidential internal note appended to case dossier',
    data: updated,
  });
}

export async function updateInvestigationStatusController(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { id } = req.params;
  const parseResult = updateStatusSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0].message,
    });
    return;
  }

  const updated = await updateInvestigationStatus(id, parseResult.data, req.user);
  if (!updated) {
    res.status(404).json({
      success: false,
      error: 'Investigation record not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: `Investigation status updated to ${parseResult.data.status}`,
    data: updated,
  });
}
