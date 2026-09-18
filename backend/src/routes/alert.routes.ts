import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { z } from 'zod';
import {
  createAlert,
  getActiveAlerts,
  getAllAlerts,
  updateAlert,
  expireAlert,
} from '../services/alert.service.js';

export const alertRouter = Router();

const createAlertSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(10).max(2000),
  severity: z.enum(['info', 'warning', 'danger']).default('warning'),
  alertType: z.enum(['safety_warning', 'missing_person', 'major_incident', 'area_warning', 'emergency_info']).optional().default('safety_warning'),
  cityName: z.string().max(100).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radiusKm: z.number().optional(),
  expiresAt: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid expiry date'),
});

// GET /api/v1/alerts/active — public, no auth needed
alertRouter.get('/active', async (_req, res) => {
  try {
    const alerts = await getActiveAlerts();
    res.json({ success: true, alerts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/alerts — all alerts (authority)
alertRouter.get('/', authenticate, authorize('officer', 'admin'), async (_req, res) => {
  try {
    const alerts = await getAllAlerts();
    res.json({ success: true, alerts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/alerts — create (authority)
alertRouter.post('/', authenticate, authorize('officer', 'admin'), async (req: any, res) => {
  const parsed = createAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  try {
    const alert = await createAlert({
      ...parsed.data,
      expiresAt: new Date(parsed.data.expiresAt),
      publishedById: req.user.id,
      publishedByName: req.user.name || req.user.email,
    });
    res.status(201).json({ success: true, alert });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/alerts/:id — update (authority)
alertRouter.put('/:id', authenticate, authorize('officer', 'admin'), async (req: any, res) => {
  try {
    const alert = await updateAlert(req.params.id, {
      title: req.body.title,
      description: req.body.description,
      severity: req.body.severity,
      alertType: req.body.alertType,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      cityName: req.body.cityName,
    });
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, alert });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/alerts/:id/expire — expire (authority)
alertRouter.patch('/:id/expire', authenticate, authorize('officer', 'admin'), async (req: any, res) => {
  try {
    const alert = await expireAlert(req.params.id);
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, alert });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
