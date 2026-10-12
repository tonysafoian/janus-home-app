import { Router, type Response } from 'express';
import { getEstateConfig, invalidateEstateConfigCache, invalidateEntityMappingsCache } from '../lib/estateConfig.js';
import { query } from '../lib/db.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { getAuthUser } from '../auth.js';
import { callHA } from './homeAssistant.js';

const router = Router();

// GET /api/estate/config — returns lat/lng, timezone, units, and estate name
router.get('/config', async (_req, res: Response) => {
  try {
    const config = await getEstateConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/settings/entity-mappings — retrieves current entity mappings
router.get('/settings/entity-mappings', async (_req, res: Response) => {
  try {
    const { rows } = await query<{ value: string }>(
      `SELECT value FROM system_configs WHERE key = 'entity_mappings' LIMIT 1`
    );
    const mappings = rows[0]?.value ? JSON.parse(rows[0].value) : {
      energy: [],
      irrigation: [],
      pool: {
        pool_heater: '',
        spa_heater: '',
        pool_temp: '',
        spa_temp: '',
        pool_pump: '',
        spa_pump: '',
      },
      climate: [],
      cameras: [],
      vehicles: [],
      utility_rates: {
        electricity_kwh_cost: 0.28,
        water_hcf_cost: 12.50,
      }
    };
    res.json(mappings);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/settings/entity-mappings — saves updated entity mappings (Admin only)
router.post('/settings/entity-mappings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const authUser = getAuthUser(req);
  const isAdmin = authUser?.roles?.includes('admin') || req.userRole === 'admin';
  if (!isAdmin) {
    res.status(403).json({ error: 'Admin privileges required to save entity mappings' });
    return;
  }

  try {
    const mappings = req.body;
    await query(
      `INSERT INTO system_configs (key, value, updated_at)
       VALUES ('entity_mappings', $1, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(mappings)]
    );
    invalidateEntityMappingsCache();
    res.json({ success: true, mappings });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/ha/discover-entities — auto-discovers relevant entities by domain & device_class
router.get('/ha/discover-entities', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  const haUrl = process.env.HA_URL || 'http://supervisor/core';
  const haToken = process.env.HA_TOKEN || process.env.SUPERVISOR_TOKEN;

  if (!haToken) {
    res.status(503).json({ error: 'Home Assistant not connected' });
    return;
  }

  try {
    const { status, data } = await callHA(haUrl, haToken, 'GET', '/api/states', undefined, { maxRetries: 1 });
    if (status !== 200 || !Array.isArray(data)) {
      res.status(500).json({ error: 'Failed to retrieve states from Home Assistant' });
      return;
    }

    const states = data as Array<{
      entity_id: string;
      state: string;
      attributes: Record<string, any>;
    }>;

    const discovered = {
      energy: states.filter(s =>
        s.entity_id.startsWith('sensor.') &&
        (s.attributes.device_class === 'energy' || s.attributes.device_class === 'power' || s.attributes.unit_of_measurement === 'kWh' || s.attributes.unit_of_measurement === 'W')
      ).map(s => ({
        entity_id: s.entity_id,
        name: s.attributes.friendly_name || s.entity_id,
        device_class: s.attributes.device_class,
        unit: s.attributes.unit_of_measurement,
      })),

      irrigation: states.filter(s =>
        (s.entity_id.startsWith('switch.') || s.entity_id.startsWith('valve.')) &&
        (s.entity_id.includes('sprinkler') || s.entity_id.includes('irrigation') || s.entity_id.includes('rain_bird') || s.entity_id.includes('zone'))
      ).map(s => ({
        entity_id: s.entity_id,
        name: s.attributes.friendly_name || s.entity_id,
      })),

      climate: states.filter(s => s.entity_id.startsWith('climate.')).map(s => ({
        entity_id: s.entity_id,
        name: s.attributes.friendly_name || s.entity_id,
        current_temperature: s.attributes.current_temperature,
        temperature: s.attributes.temperature,
      })),

      cameras: states.filter(s => s.entity_id.startsWith('camera.')).map(s => ({
        entity_id: s.entity_id,
        name: s.attributes.friendly_name || s.entity_id,
        state: s.state,
      })),

      vehicles: states.filter(s =>
        (s.entity_id.startsWith('sensor.') || s.entity_id.startsWith('device_tracker.')) &&
        (s.entity_id.includes('tesla') || s.entity_id.includes('vehicle') || s.entity_id.includes('battery') || s.attributes.device_class === 'battery')
      ).map(s => ({
        entity_id: s.entity_id,
        name: s.attributes.friendly_name || s.entity_id,
        state: s.state,
      })),

      pool: states.filter(s =>
        s.entity_id.includes('pool') || s.entity_id.includes('spa') || s.entity_id.includes('iaqualink')
      ).map(s => ({
        entity_id: s.entity_id,
        name: s.attributes.friendly_name || s.entity_id,
        state: s.state,
      })),

      persons: states.filter(s => s.entity_id.startsWith('person.')).map(s => ({
        entity_id: s.entity_id,
        name: s.attributes.friendly_name || s.entity_id,
        user_id: s.attributes.user_id,
      })),
    };

    res.json(discovered);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
