import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createIncident,
  getMyIncidents,
  getIncidentById,
  getCategories,
  addIncidentEvidence,
  getMapIncidents,
  MapFiltersDTO,
  getOfficerQueue,
  getOfficerIncidentDetail,
  reviewIncident,
  OfficerReviewDTO,
  createCategory,
} from '../services/incident.service.js';

const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(100),
  slug: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

const createIncidentSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z
    .string()
    .min(10, 'Please provide a detailed description (at least 10 characters)')
    .max(2000, 'Description cannot exceed 2000 characters'),
  categorySlug: z.string().min(1, 'Category selection is required'),
  severity: z.coerce.number().min(1).max(5).default(2),
  latitude: z.coerce
    .number()
    .min(-90, 'Invalid latitude coordinate')
    .max(90, 'Invalid latitude coordinate'),
  longitude: z.coerce
    .number()
    .min(-180, 'Invalid longitude coordinate')
    .max(180, 'Invalid longitude coordinate'),
  address: z.string().min(3, 'Address or location description is required').max(300),
  incidentDate: z.string().optional(),
  isAnonymous: z.boolean().optional().default(false),
});

export async function getCategoriesController(_req: Request, res: Response): Promise<void> {
  const categories = await getCategories();
  res.status(200).json({
    success: true,
    data: categories,
  });
}

export async function createCategoryController(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Administrative clearance required.' });
    return;
  }

  const parseResult = createCategorySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0].message,
    });
    return;
  }

  try {
    const category = await createCategory(parseResult.data);
    res.status(201).json({
      success: true,
      message: 'Incident category created successfully.',
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create incident category.',
    });
  }
}

export async function createIncidentController(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const parseResult = createIncidentSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0].message,
      details: parseResult.error.format(),
    });
    return;
  }

  // SECURITY: reporterId is derived strictly from req.user
  const incident = await createIncident(parseResult.data, req.user);

  res.status(201).json({
    success: true,
    message: 'Incident report submitted successfully. Initial status is SUBMITTED.',
    data: incident,
  });
}

export async function getMyIncidentsController(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  // SECURITY: Only retrieve reports matching the authenticated user's ID
  const incidents = await getMyIncidents(req.user.id);

  res.status(200).json({
    success: true,
    count: incidents.length,
    data: incidents,
  });
}

export async function getIncidentByIdController(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const incident = await getIncidentById(req.params.id, req.user);

  // SECURITY / IDOR: If report does not exist or belongs to another citizen, return 404
  if (!incident) {
    res.status(404).json({
      success: false,
      error: 'Incident report not found or you do not have permission to view it.',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: incident,
  });
}

export async function uploadEvidenceController(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, error: 'No evidence file provided' });
    return;
  }

  const incidentId = req.params.id;
  const fileSizeMB = parseFloat((req.file.size / (1024 * 1024)).toFixed(2));
  const base64Data = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  const evidence = await addIncidentEvidence(
    incidentId,
    {
      fileUrl: base64Data,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSizeMB,
    },
    req.user
  );

  if (!evidence) {
    res.status(404).json({
      success: false,
      error: 'Incident report not found or you do not have permission to attach evidence to it.',
    });
    return;
  }

  res.status(201).json({
    success: true,
    message: 'Evidence attached successfully',
    data: evidence,
  });
}

export async function getMapIncidentsController(req: Request, res: Response): Promise<void> {
  try {
    const filters: MapFiltersDTO = {};

    // Parse Bounding Box if provided: minLng,minLat,maxLng,maxLat
    if (typeof req.query.bbox === 'string') {
      const parts = req.query.bbox.split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
        filters.bbox = parts as [number, number, number, number];
      }
    }

    // Parse lat/lng and radius
    if (typeof req.query.lat === 'string' && typeof req.query.lng === 'string') {
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        filters.lat = lat;
        filters.lng = lng;
        if (typeof req.query.radiusKm === 'string') {
          const r = parseFloat(req.query.radiusKm);
          if (!isNaN(r)) filters.radiusKm = r;
        }
      }
    }

    // Category filter
    if (typeof req.query.category === 'string') {
      filters.category = req.query.category.trim();
    }

    // Status filter
    if (typeof req.query.status === 'string') {
      filters.status = req.query.status.trim();
    }

    // Time window filter
    if (typeof req.query.timeRange === 'string') {
      filters.timeRange = req.query.timeRange.trim();
    }

    // Limit
    if (typeof req.query.limit === 'string') {
      const l = parseInt(req.query.limit, 10);
      if (!isNaN(l)) filters.limit = Math.min(Math.max(l, 1), 200);
    }

    const incidents = await getMapIncidents(filters);

    res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve map incidents.',
    });
  }
}

// ---------------------------------------------------------------------------
// Phase 5: Authority Dashboard & Incident Review Handlers
// ---------------------------------------------------------------------------

const reviewActionSchema = z.object({
  action: z.enum(['start_review', 'verify', 'reject'], {
    errorMap: () => ({ message: "Action must be 'start_review', 'verify', or 'reject'" }),
  }),
  note: z.string().max(1000).optional(),
  reason: z.string().max(500).optional(),
});

export async function getOfficerQueueController(req: Request, res: Response): Promise<void> {
  if (!req.user || (req.user.role !== 'officer' && req.user.role !== 'admin')) {
    res.status(403).json({ success: false, error: 'Officer or Admin clearance required.' });
    return;
  }

  try {
    const filters: any = {};
    if (typeof req.query.status === 'string') filters.status = req.query.status.trim();
    if (typeof req.query.category === 'string') filters.category = req.query.category.trim();
    if (typeof req.query.severity === 'string') {
      const s = parseInt(req.query.severity, 10);
      if (!isNaN(s)) filters.severity = s;
    }
    if (typeof req.query.searchQuery === 'string') filters.searchQuery = req.query.searchQuery.trim();
    if (typeof req.query.sortBy === 'string') filters.sortBy = req.query.sortBy.trim();

    // Department scoping: officers only see incidents in their assigned department
    if (req.user.role === 'officer' && req.user.department) {
      filters.department = req.user.department;
    } else if (typeof req.query.department === 'string') {
      filters.department = req.query.department.trim();
    }

    const { stats, incidents } = await getOfficerQueue(filters);

    res.status(200).json({
      success: true,
      stats,
      count: incidents.length,
      data: incidents,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve officer incident queue.',
    });
  }
}

export async function getOfficerIncidentDetailController(req: Request, res: Response): Promise<void> {
  if (!req.user || (req.user.role !== 'officer' && req.user.role !== 'admin')) {
    res.status(403).json({ success: false, error: 'Officer or Admin clearance required.' });
    return;
  }

  try {
    const incident = await getOfficerIncidentDetail(req.params.id);

    if (!incident) {
      res.status(404).json({
        success: false,
        error: 'Incident record not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: incident,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve incident details for review.',
    });
  }
}

export async function reviewIncidentController(req: Request, res: Response): Promise<void> {
  if (!req.user || (req.user.role !== 'officer' && req.user.role !== 'admin')) {
    res.status(403).json({ success: false, error: 'Officer or Admin clearance required.' });
    return;
  }

  const parseResult = reviewActionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.errors[0].message,
    });
    return;
  }

  const { action, reason, note } = parseResult.data;

  // Validation: Rejections require a stated rationale
  if (action === 'reject' && !reason && !note) {
    res.status(400).json({
      success: false,
      error: 'A reason or note is required when rejecting a report.',
    });
    return;
  }

  try {
    const updated = await reviewIncident(req.params.id, parseResult.data, req.user);

    if (!updated) {
      res.status(404).json({
        success: false,
        error: 'Incident record not found or could not be transitioned.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Incident ${updated.trackingId} status transitioned to ${updated.status.toUpperCase()}`,
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to execute incident review action.',
    });
  }
}


