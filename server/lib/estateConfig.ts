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
