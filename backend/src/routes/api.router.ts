import { Router, Request, Response } from 'express';
import { healthRouter } from './health.router.js';
import { authRouter } from './auth.routes.js';
import { incidentRouter } from './incident.routes.js';
import { investigationRouter } from './investigation.routes.js';
import { notificationRouter } from './notification.routes.js';
import { messageRouter } from './message.routes.js';
import { analyticsRouter } from './analytics.routes.js';
import { alertRouter } from './alert.routes.js';
import { odooRouter } from './odoo.routes.js';
import { aiRouter } from './ai.routes.js';

export const apiRouter = Router();

// Mount health check at /api/v1/health
apiRouter.use(healthRouter);

// Mount authentication routes at /api/v1/auth
apiRouter.use('/auth', authRouter);

// Mount incident routes at /api/v1/incidents
apiRouter.use('/incidents', incidentRouter);

// Mount investigation routes at /api/v1/investigations
apiRouter.use('/investigations', investigationRouter);

// Phase 7: Notification routes
apiRouter.use('/notifications', notificationRouter);

// Phase 8: Message routes
apiRouter.use('/messages', messageRouter);

// Phase 9: Analytics routes (authority only)
apiRouter.use('/analytics', analyticsRouter);

// Phase 10: Alert routes
apiRouter.use('/alerts', alertRouter);

// Phase 11: Odoo Integration routes
apiRouter.use('/odoo', odooRouter);

// Phase 12: AI Assistance routes
apiRouter.use('/ai', aiRouter);

// Base API endpoint information
apiRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Trinetra API v1',
    documentation: 'Refer to docs/api.md and implementation_plan.md',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth (Phase 2)',
      incidents: '/api/v1/incidents (Phase 3-5)',
      investigations: '/api/v1/investigations (Phase 6)',
      alerts: '/api/v1/alerts (Phase 10)',
      analytics: '/api/v1/analytics (Phase 9)',
      odoo: '/api/v1/odoo (Phase 11)',
      ai: '/api/v1/ai (Phase 12)',
    },
  });
});
