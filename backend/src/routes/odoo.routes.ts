import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import {
  syncIncidentToOdoo,
  getOdooIntegrationStatus,
  batchSyncOdoo,
} from '../services/odoo.service.js';

export const odooRouter = Router();

// GET /api/v1/odoo/status — authority status & stats
odooRouter.get('/status', authenticate, authorize('officer', 'admin'), async (_req, res) => {
  try {
    const status = await getOdooIntegrationStatus();
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/odoo/sync/:id — trigger sync for specific incident
odooRouter.post('/sync/:id', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const result = await syncIncidentToOdoo(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/odoo/batch-sync — trigger batch sync
odooRouter.post('/batch-sync', authenticate, authorize('officer', 'admin'), async (_req, res) => {
  try {
    const result = await batchSyncOdoo();
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
