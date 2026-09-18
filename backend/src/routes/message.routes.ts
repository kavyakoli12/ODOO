import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

import { getConversation, sendMessage } from '../services/message.service.js';
import { z } from 'zod';

export const messageRouter = Router();

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000),
  isInternalNote: z.boolean().optional().default(false),
});

// GET /api/v1/messages/:incidentId
messageRouter.get('/:incidentId', authenticate, async (req: any, res) => {
  try {
    const result = await getConversation(req.params.incidentId, req.user.id, req.user.role);
    res.json({ success: true, ...result });
  } catch (err: any) {
    const isAccessDenied = err.message === 'Access denied';
    res.status(isAccessDenied ? 403 : 500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/messages/:incidentId
messageRouter.post('/:incidentId', authenticate, async (req: any, res) => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  // Citizens cannot send internal notes
  const isInternal = parsed.data.isInternalNote && (req.user.role === 'officer' || req.user.role === 'admin');

  try {
    const message = await sendMessage({
      incidentId: req.params.incidentId,
      senderId: req.user.id,
      senderRole: req.user.role,
      senderName: req.user.name || req.user.email,
      content: parsed.data.content,
      isInternalNote: isInternal,
    });
    res.status(201).json({ success: true, message });
  } catch (err: any) {
    const isAccessDenied = err.message === 'Access denied';
    res.status(isAccessDenied ? 403 : 500).json({ success: false, error: err.message });
  }
});
