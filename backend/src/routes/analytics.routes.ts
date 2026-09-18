import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';

import {
  getFullAnalytics,
  getAnalyticsSummary,
  getIncidentsByCategory,
  getIncidentsByStatus,
  getIncidentsTrend,
  getIncidentsByTimeOfDay,
  getResolutionTrends,
  getTopAreas,
  getMapAnalyticsData,
  AnalyticsFilters,
} from '../services/analytics.service.js';

export const analyticsRouter = Router();

// All analytics routes require officer/admin
analyticsRouter.use(authenticate, authorize('officer', 'admin'));

function parseFilters(req: any): AnalyticsFilters {
  return {
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    category: req.query.category as string,
    status: req.query.status as string,
    area: req.query.area as string,
    groupBy: (req.query.groupBy as 'day' | 'week' | 'month') || 'day',
  };
}

// GET /api/v1/analytics — full bundle
analyticsRouter.get('/', async (req, res) => {
  try {
    const filters = parseFilters(req);
    const data = await getFullAnalytics(filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/analytics/summary
analyticsRouter.get('/summary', async (req, res) => {
  try {
    const filters = parseFilters(req);
    const data = await getAnalyticsSummary(filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/analytics/category
analyticsRouter.get('/category', async (req, res) => {
  try {
    const filters = parseFilters(req);
    const data = await getIncidentsByCategory(filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/analytics/status
analyticsRouter.get('/status', async (req, res) => {
  try {
    const filters = parseFilters(req);
    const data = await getIncidentsByStatus(filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/analytics/trend
analyticsRouter.get('/trend', async (req, res) => {
  try {
    const filters = parseFilters(req);
    const days = Math.min(90, Math.max(7, parseInt((req.query.days as string) || '14', 10)));
    const data = await getIncidentsTrend(filters, days);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/analytics/time-of-day
analyticsRouter.get('/time-of-day', async (req, res) => {
  try {
    const filters = parseFilters(req);
    const data = await getIncidentsByTimeOfDay(filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/analytics/resolutions
analyticsRouter.get('/resolutions', async (req, res) => {
  try {
    const filters = parseFilters(req);
    const data = await getResolutionTrends(filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/analytics/areas
analyticsRouter.get('/areas', async (req, res) => {
  try {
    const filters = parseFilters(req);
    const data = await getTopAreas(filters, 10);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/analytics/map
analyticsRouter.get('/map', async (req, res) => {
  try {
    const filters = parseFilters(req);
    const data = await getMapAnalyticsData(filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
