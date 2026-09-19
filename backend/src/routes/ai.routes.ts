import { Router } from 'express';
import {
  suggestCategory,
  detectDuplicates,
  summarizeReport,
  suggestPriority,
  queryNaturalLanguageAnalytics,
  analyzeCrimeImage,
} from '../services/ai.service.js';

export const aiRouter = Router();

// POST /api/v1/ai/analyze-crime — camera scene scanning & verification
aiRouter.post('/analyze-crime', async (req, res) => {
  try {
    const { imageBase64 = '', mimeType = 'image/jpeg', visualHints } = req.body;
    if (!imageBase64 || imageBase64.length < 50) {
      return res.status(400).json({ success: false, error: 'Valid image payload is required' });
    }

    const analysis = await analyzeCrimeImage(imageBase64, mimeType, visualHints);
    res.json({ success: true, data: analysis });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/ai/categorize — public & authority
aiRouter.post('/categorize', async (req, res) => {
  try {
    const { title = '', description = '' } = req.body;
    const suggestions = await suggestCategory(title, description);
    res.json({ success: true, suggestions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/ai/duplicates — duplicate detection
aiRouter.post('/duplicates', async (req, res) => {
  try {
    const { incidentId, description = '', address = '', categoryName = '' } = req.body;
    const matches = await detectDuplicates(incidentId, description, address, categoryName);
    res.json({ success: true, matches });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/ai/summarize-priority — summary & priority
aiRouter.post('/summarize-priority', async (req, res) => {
  try {
    const { description = '', categoryName = '' } = req.body;
    const [summary, priority] = await Promise.all([
      summarizeReport(description),
      suggestPriority(description, categoryName),
    ]);
    res.json({ success: true, summary, priority });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/ai/query-analytics — natural language analytics query
aiRouter.post('/query-analytics', async (req, res) => {
  try {
    const { query = '' } = req.body;
    const result = await queryNaturalLanguageAnalytics(query);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
