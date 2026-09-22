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
 * Returns high-incident danger red zones computed from verified incidents.
 */
escortRouter.get('/danger-zones', async (_req: Request, res: Response) => {
  try {
    // 1. Defined prominent zones in Delhi NCR with verified high-incident risk
    const defaultZones = [
      {
        id: 'zone-cp-block-a',
        name: 'Connaught Place - Inner Circle (Block A & B)',
        centerCoordinates: [77.2195, 28.6315], // [lng, lat]
        radiusMeters: 750,
        riskLevel: 'critical',
        incidentCount: 14,
        recentCrimes: ['Armed Threat', 'Robbery', 'Snatching'],
      },
      {
        id: 'zone-lajpat-central',
        name: 'Lajpat Nagar Central Market Area',
        centerCoordinates: [77.2435, 28.5705],
        radiusMeters: 900,
        riskLevel: 'high',
        incidentCount: 11,
        recentCrimes: ['Theft & Burglary', 'Pickpocketing', 'Vandalism'],
      },
      {
        id: 'zone-nehru-place',
        name: 'Nehru Place Outer Ring Transit Corridor',
        centerCoordinates: [77.2515, 28.549],
        radiusMeters: 800,
        riskLevel: 'high',
        incidentCount: 8,
        recentCrimes: ['Vehicle Theft', 'Physical Assault'],
      },
      {
        id: 'zone-rohini-sec3',
        name: 'Rohini Sector 3 Metro Corridor',
        centerCoordinates: [77.118, 28.699],
        radiusMeters: 850,
        riskLevel: 'moderate',
        incidentCount: 6,
        recentCrimes: ['Suspicious Activity', 'Poor Lighting'],
      },
    ];

    // 2. Dynamically ingest all real reported incidents (handles both Mongo and memory storage)
    let dynamicIncidentZones: any[] = [];
    try {
      const activeIncidents = await getMapIncidents({ limit: 60 });
      dynamicIncidentZones = activeIncidents
        .filter((inc) => inc.location?.coordinates && inc.location.coordinates.length === 2)
        .map((inc) => ({
          id: `incident-${inc.id}`,
          name: `${inc.title} (${inc.approximateAddress || inc.categoryName || 'Hazard Area'})`,
          centerCoordinates: inc.location.coordinates, // [lng, lat]
          radiusMeters: (inc.severity || 2) >= 3 ? 1000 : 750,
          riskLevel: (inc.severity || 2) >= 4 ? 'critical' : (inc.severity || 2) >= 3 ? 'high' : 'moderate',
          incidentCount: 1,
          recentCrimes: [inc.categoryName || 'Reported Hazard'],
        }));
    } catch {
      // Fallback if error
    }

    const allZones = [...dynamicIncidentZones, ...defaultZones];

    res.json({
      success: true,
      count: allZones.length,
      data: allZones,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
