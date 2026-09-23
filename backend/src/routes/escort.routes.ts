import { Router, Request, Response } from 'express';
import {
  getActiveEscorts,
  emitToRole,
  registerActiveEscort,
  recordActiveEscortMovement,
  recordActiveEscortStatus,
  endActiveEscort,
} from '../socket.js';
import { SafeEscortSession } from '../models/SafeEscortSession.js';
import { Incident } from '../models/Incident.js';
import { getMapIncidents } from '../services/incident.service.js';

export const escortRouter = Router();

/**
 * POST /api/v1/escorts/start
 * Citizen starts a Safe Passage Escort session (REST fallback & primary persistence).
 */
escortRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const sessionData = await registerActiveEscort(req.body);
    res.status(201).json({
      success: true,
      message: `Safe passage escort registered for ${sessionData.citizenName}`,
      data: sessionData,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/escorts/:sessionId/location
 * Citizen updates live coordinates while navigating the danger corridor.
 */
escortRouter.post('/:sessionId/location', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { currentCoordinates, speed = 0, heading = 0 } = req.body;
    const session = recordActiveEscortMovement(sessionId, currentCoordinates, speed, heading);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Escort session not found or ended' });
    }
    res.json({ success: true, data: session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/escorts/:sessionId/status
 * Updates escort status (monitoring, stoppage_warning, distress).
 */
escortRouter.post('/:sessionId/status', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { status, reason } = req.body;
    const session = recordActiveEscortStatus(sessionId, status, reason);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Escort session not found' });
    }
    res.json({ success: true, data: session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/escorts/:sessionId/stop
 * Citizen exits danger zone or cancels escort.
 */
escortRouter.post('/:sessionId/stop', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const ended = endActiveEscort(sessionId);
    res.json({ success: true, message: ended ? 'Session ended' : 'Session already cleared' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/escorts/active
 * Returns all currently active Safe Passage Escort sessions for Officer Radar Console.
 */
escortRouter.get('/active', async (_req: Request, res: Response) => {
  try {
    const memoryEscorts = getActiveEscorts();

    // If MongoDB is connected, merge any recently active sessions from DB
    let dbEscorts: any[] = [];
    try {
      dbEscorts = await SafeEscortSession.find({
        status: { $in: ['monitoring', 'stoppage_warning', 'distress'] },
      })
        .sort({ updatedAt: -1 })
        .limit(30)
        .lean();
    } catch {
      // Offline fallback
    }

    // Merge by sessionId, prioritizing latest memory state
    const sessionMap = new Map<string, any>();
    for (const d of dbEscorts) {
      sessionMap.set(d.sessionId, d);
    }
    for (const m of memoryEscorts) {
      sessionMap.set(m.sessionId, m);
    }

    const merged = Array.from(sessionMap.values());

    res.json({
      success: true,
      count: merged.length,
      data: merged,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/escorts/:sessionId/dispatch
 * Officer action: Dispatch patrol car or acknowledge distress.
 */
escortRouter.post('/:sessionId/dispatch', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { unitId = 'Patrol Unit #104', notes = '' } = req.body;

    const memoryEscorts = getActiveEscorts();
    const target = memoryEscorts.find((e) => e.sessionId === sessionId);
    if (target) {
      target.dispatchedUnit = unitId;
      target.officerNotes = notes;
    }

    try {
      await SafeEscortSession.updateOne(
        { sessionId },
        { $set: { dispatchedUnit: unitId, officerNotes: notes } }
      );
    } catch {}

    // Notify all officers of dispatch action
    emitToRole('officer', 'escort:officer_action', {
      sessionId,
      unitId,
      notes,
      dispatchedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Dispatched ${unitId} to assist citizen session ${sessionId}`,
      data: { sessionId, unitId, notes },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/escorts/danger-zones
 * Returns high-incident danger red zones computed dynamically from real incidents.
 * Per citizen safety policy:
 * 1. No permanent static red zones are returned.
 * 2. When an incident is reported, it generates an active red zone.
 * 3. If an incident is resolved (or occurred), the danger spot remains active for strictly 7 days before expiring.
 */
escortRouter.get('/danger-zones', async (_req: Request, res: Response) => {
  try {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Dynamically ingest real reported incidents (handles both MongoDB and memory fallback)
    let dynamicIncidentZones: any[] = [];
    try {
      const allIncidents = await getMapIncidents({ limit: 100 });
      dynamicIncidentZones = allIncidents
        .filter((inc) => {
          if (!inc.location?.coordinates || inc.location.coordinates.length !== 2) return false;
          if (inc.status === 'rejected') return false;

          const incidentTime = new Date(inc.incidentDate || inc.createdAt).getTime();
          const ageMs = now - incidentTime;

          // Incident spot is active strictly for 7 days
          if (ageMs > SEVEN_DAYS_MS) {
            return false;
          }

          return true;
        })
        .map((inc) => {
          const incidentTime = new Date(inc.incidentDate || inc.createdAt).getTime();
          const ageMs = now - incidentTime;
          const daysRemaining = Math.max(1, Math.ceil((SEVEN_DAYS_MS - ageMs) / (24 * 60 * 60 * 1000)));

          return {
            id: `incident-${inc.id}`,
            incidentId: inc.id,
            name: `${inc.title} (${inc.approximateAddress || inc.categoryName || 'Hazard Spot'})`,
            centerCoordinates: inc.location.coordinates, // [lng, lat]
            radiusMeters: (inc.severity || 2) >= 3 ? 1000 : 750,
            riskLevel: (inc.severity || 2) >= 4 ? 'critical' : (inc.severity || 2) >= 3 ? 'high' : 'moderate',
            incidentCount: 1,
            recentCrimes: [inc.categoryName || 'Reported Incident'],
            status: inc.status,
            isResolved: inc.status === 'resolved',
            activeDaysRemaining: daysRemaining,
            incidentDate: inc.incidentDate,
          };
        });
    } catch {
      // Fallback if error
    }

    res.json({
      success: true,
      count: dynamicIncidentZones.length,
      data: dynamicIncidentZones,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
