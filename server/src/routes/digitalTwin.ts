/**
 * Digital Twin API Routes
 *
 * All routes are read-only with respect to real HRE data.
 * Simulations never create real bookings, reservations, or payments.
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticateRequest } from '../middleware/auth.js';
import { getCurrentWeather, getWeatherForecast } from '../services/digitalTwin/weatherService.js';
import { runSimulation, listUserSimulations, getSimulationResult } from '../services/digitalTwin/simulationService.js';
import { getSocialSignals } from '../services/digitalTwin/socialSignalService.js';
import type { Request, Response } from 'express';

const router = Router();

// Middleware to ensure authentication
router.use(authenticateRequest);

/**
 * GET /api/weather/current
 * Get live weather for a location
 */
router.get('/weather/current', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, location } = z.object({ latitude: z.coerce.number(), longitude: z.coerce.number(), location: z.string().optional() }).parse(req.query);

    const weather = await getCurrentWeather(latitude, longitude, location);

    // Add clear labeling
    res.json({
      ...weather,
      dataType: 'LIVE WEATHER',
      source: weather.source,
      timestamp: weather.timestamp,
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid parameters' });
  }
});

/**
 * GET /api/weather/forecast
 * Get weather forecast
 */
router.get('/weather/forecast', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, days, location } = z
      .object({ latitude: z.coerce.number(), longitude: z.coerce.number(), days: z.coerce.number().default(3), location: z.string().optional() })
      .parse(req.query);

    const forecast = await getWeatherForecast(latitude, longitude, days, location);

    res.json({
      ...forecast,
      dataType: 'WEATHER FORECAST',
      source: 'openweather',
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid parameters' });
  }
});

/**
 * GET /api/digital-twin/state/:requirementId
 * Get current real HRE state for a requirement
 */
router.get('/state/:requirementId', async (req: Request, res: Response) => {
  try {
    const { requirementId } = req.params;

    // This is read-only HRE state display
    // No simulation involved
    res.json({
      message: 'Real HRE state endpoint (not yet implemented)',
      requirementId,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get digital twin state' });
  }
});

/**
 * POST /api/digital-twin/simulate
 * Run a what-if simulation
 *
 * CRITICAL: This creates simulation records but NEVER modifies real HRE data.
 */
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const inputSchema = z.object({
      requirementId: z.string(),
      rainfall: z.number().min(0).max(500),
      stormDuration: z.number().min(0).max(24),
      temperature: z.number().min(-50).max(60),
      windSpeed: z.number().min(0).max(200),
      location: z.string().optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
    });

    const input = inputSchema.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Run simulation (read-only with respect to real data)
    const result = await runSimulation({
      userId,
      ...input,
    });

    res.json({
      dataType: 'SIMULATED RESULTS',
      simulation: result,
      note: 'These are PROJECTED/SIMULATED values. Real HRE data has NOT been modified.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Simulation failed' });
    }
  }
});

/**
 * GET /api/digital-twin/simulations/:id
 * Get simulation result
 */
router.get('/simulations/:id', async (req: Request, res: Response) => {
  try {
    const result = await getSimulationResult(req.params.id);

    res.json({
      dataType: 'SIMULATED RESULTS',
      result,
      note: 'These are PROJECTED/SIMULATED values.',
    });
  } catch (error) {
    res.status(404).json({ error: 'Simulation not found' });
  }
});

/**
 * GET /api/digital-twin/my-simulations
 * List user's simulations
 */
router.get('/my-simulations', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const simulations = await listUserSimulations(userId, 10);

    res.json({
      dataType: 'USER SIMULATIONS',
      simulations: simulations.map((s) => ({
        scenarioId: s.id,
        requirementId: s.requirementId,
        parameters: {
          rainfall: s.rainfall,
          stormDuration: s.stormDuration,
          temperature: s.temperature,
          windSpeed: s.windSpeed,
        },
        result: s.result
          ? {
              projectedFulfillmentPercent: s.result.projectedFulfillmentPercent,
              fulfillmentRisk: s.result.fulfillmentRisk,
              unitsAtRisk: s.result.unitsAtRisk,
            }
          : null,
        createdAt: s.createdAt,
      })),
      note: 'All results are SIMULATED/PROJECTED values.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list simulations' });
  }
});

/**
 * GET /api/digital-twin/social-signals
 * Get public/social weather-related signals
 * All demo signals are clearly labeled
 */
router.get('/social-signals', async (req: Request, res: Response) => {
  try {
    const { location, weatherCondition } = z
      .object({ location: z.string().optional(), weatherCondition: z.string().optional() })
      .parse(req.query);

    const { signals, source } = await getSocialSignals(location ?? 'Thane', weatherCondition ?? 'rain');

    res.json({
      dataType: source === 'live' ? 'LIVE PUBLIC SIGNALS' : 'PUBLIC SIGNALS',
      source,
      signals: signals.map((s) => ({
        id: s.id,
        location: s.location,
        timestamp: s.timestamp,
        type: s.type,
        severity: s.severity,
        message: s.message,
        source: s.source,
        url: s.url,
        label: s.isDemo ? 'DEMO PUBLIC SIGNAL' : 'LIVE PUBLIC SIGNAL',
      })),
      note:
        source === 'live'
          ? 'Fetched live from Reddit\'s public search API. Real-world posts, not fabricated.'
          : 'No live posts matched — showing labeled demo signals as fallback.',
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid parameters' });
  }
});

export default router;
