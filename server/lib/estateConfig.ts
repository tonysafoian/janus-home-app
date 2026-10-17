/**
 * Estate Configuration Service
 *
 * Centralizes location (lat/lng), time zone, and unit system.
 * Dynamically queries Home Assistant Core /api/config when connected,
 * falling back to environment variables or safe defaults.
 */

import { callHA } from '../routes/homeAssistant.js';

export interface EstateConfig {
  latitude: number;
  longitude: number;
  elevation: number;
  timeZone: string;
  unitSystem: {
    length: string;
    mass: string;
    pressure: string;
    temperature: string;
    volume: string;
  };
  locationName: string;
}

let cachedConfig: EstateConfig | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getEstateConfig(): Promise<EstateConfig> {
  const now = Date.now();
  if (cachedConfig && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedConfig;
  }

  // Safe fallback defaults
  const fallback: EstateConfig = {
    latitude: Number(process.env.HOME_LAT) || 37.7749,
    longitude: Number(process.env.HOME_LNG) || -122.4194,
    elevation: 0,
    timeZone: process.env.TZ || process.env.TIME_ZONE || 'UTC',
    unitSystem: {
      length: 'mi',
      mass: 'lb',
      pressure: 'psi',
      temperature: '°F',
      volume: 'gal',
    },
    locationName: process.env.HOME_LOCATION || 'Home',
  };

  const haUrl = process.env.HA_URL || 'http://supervisor/core';
  const haToken = process.env.HA_TOKEN || process.env.SUPERVISOR_TOKEN;

  if (!haToken) {
    cachedConfig = fallback;
    lastFetchTime = now;
    return cachedConfig;
  }

  try {
    const { status, data } = await callHA(haUrl, haToken, 'GET', '/api/config', undefined, { maxRetries: 1 });
    if (status === 200 && data && typeof data === 'object') {
      const d = data as Record<string, any>;
      cachedConfig = {
        latitude: typeof d.latitude === 'number' ? d.latitude : fallback.latitude,
        longitude: typeof d.longitude === 'number' ? d.longitude : fallback.longitude,
        elevation: typeof d.elevation === 'number' ? d.elevation : fallback.elevation,
        timeZone: d.time_zone || fallback.timeZone,
        unitSystem: d.unit_system || fallback.unitSystem,
        locationName: d.location_name || fallback.locationName,
      };
      lastFetchTime = now;
      return cachedConfig;
    }
  } catch (err) {
    console.warn('[estateConfig] Failed to fetch HA /api/config, using fallback:', err instanceof Error ? err.message : err);
  }

  cachedConfig = fallback;
  lastFetchTime = now;
  return cachedConfig;
}

export function invalidateEstateConfigCache(): void {
  cachedConfig = null;
  lastFetchTime = 0;
}

export function getEstateTimezone(): string {
  if (cachedConfig?.timeZone) return cachedConfig.timeZone;
  return process.env.TZ || process.env.TIME_ZONE || 'UTC';
}

export interface EntityMappings {
  energy?: string[];
  irrigation?: string[];
  pool?: {
    pool_heater?: string;
    spa_heater?: string;
    pool_temp?: string;
    spa_temp?: string;
    pool_pump?: string;
    spa_pump?: string;
  };
  climate?: string[];
  cameras?: string[];
  vehicles?: string[];
  speedtest?: {
    download?: string;
    upload?: string;
    ping?: string;
  };
  utility_rates?: {
    electricity_kwh_cost?: number;
    water_hcf_cost?: number;
  };
}

let cachedEntityMappings: EntityMappings | null = null;
let lastEntityMappingsFetchTime = 0;

export async function getEntityMappings(): Promise<EntityMappings> {
  const now = Date.now();
  if (cachedEntityMappings && now - lastEntityMappingsFetchTime < CACHE_TTL_MS) {
    return cachedEntityMappings;
  }

  const fallback: EntityMappings = {
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
    speedtest: {
      download: '',
      upload: '',
      ping: '',
    },
    utility_rates: {
      electricity_kwh_cost: 0.28,
      water_hcf_cost: 12.5,
    },
  };

  try {
    const { query } = await import('./db.js');
    const res = await query<{ value: string }>(
      `SELECT value FROM system_configs WHERE key = 'entity_mappings' LIMIT 1`
    );
    if (res?.rows?.[0]?.value) {
      const parsed = typeof res.rows[0].value === 'string' ? JSON.parse(res.rows[0].value) : res.rows[0].value;
      cachedEntityMappings = {
        ...fallback,
        ...parsed,
        pool: {
          ...fallback.pool,
          ...(parsed.pool || {}),
        },
        speedtest: {
          ...fallback.speedtest,
          ...(parsed.speedtest || {}),
        },
        utility_rates: {
          ...fallback.utility_rates,
          ...(parsed.utility_rates || {}),
        },
      };
      lastEntityMappingsFetchTime = now;
      return cachedEntityMappings!;
    }
  } catch (err) {
    console.warn('[estateConfig] Failed to fetch entity_mappings from system_configs:', err instanceof Error ? err.message : err);
  }

  cachedEntityMappings = fallback;
  lastEntityMappingsFetchTime = now;
  return cachedEntityMappings;
}

export function invalidateEntityMappingsCache(): void {
  cachedEntityMappings = null;
  lastEntityMappingsFetchTime = 0;
}
