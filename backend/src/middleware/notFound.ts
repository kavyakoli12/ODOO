import { Request, Response } from 'express';

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`,
  });
}
