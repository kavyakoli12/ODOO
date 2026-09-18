import { Router, Request, Response } from 'express';
import { getDBStatus } from '../config/db.js';
import { env } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  const dbStatus = getDBStatus();
  const uptimeSeconds = Math.floor(process.uptime());

  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    environment: env.NODE_ENV,
    service: 'SafeMap Real-Time API',
    version: '1.0.0',
    database: dbStatus,
  });
});
