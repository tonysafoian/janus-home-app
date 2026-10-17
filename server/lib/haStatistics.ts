/**
 * Home Assistant Long-Term Statistics Fetcher
 * ────────────────────────────────────────────
 * Uses the existing HA WebSocket connection (haWebSocket.ts) to query
 * the recorder/statistics_during_period endpoint for kWh data from
 * Emporia Vue energy sensors.
 */

import { sendHAWSCommand, getEntityCache } from './haWebSocket.js';
import { query } from './db.js';
import { getEstateTimezone } from './estateConfig.js';

// ── Emporia circuit entity map ─────────────────────────────────────────
// These are the _energy_today_ entities (kWh, total_increasing) — not the power (W) entities.
// HA's Emporia integration exposes `<name>_energy_today` and `_energy_this_month`
// (there is no bare `<name>_energy`). HA auto-records long-term statistics for these,
// so they are valid statistic_ids for recorder/statistics_during_period.
// Numeric duplicate suffix goes at the END, e.g. `<name>_energy_today_2`.

export interface CircuitMeta {
  entityId: string;       // energy entity (kWh)
  powerEntityId: string;  // power entity (W) — for real-time display
  label: string;
  category: string;
  panel?: string;         // parent panel id (matches PANEL_CATALOG ids in the frontend)
}

export function discoverEnergyCircuitsFromEntities(
  entities: Array<{ entity_id: string; attributes?: Record<string, unknown> }>,
): CircuitMeta[] {
  const discovered: CircuitMeta[] = [];
  const seen = new Set<string>();

  for (const e of entities) {
    if (!e.entity_id || !e.entity_id.startsWith('sensor.')) continue;
    if (seen.has(e.entity_id)) continue;

    const isEnergy =
      e.entity_id.includes('_energy_today') ||
      e.entity_id.endsWith('_energy') ||
      e.attributes?.device_class === 'energy' ||
      e.attributes?.unit_of_measurement === 'kWh';

    if (!isEnergy) continue;

    const powerEntityId = e.entity_id
      .replace('_energy_today', '_power_minute_average')
      .replace('_energy', '_power');
    const friendlyName =
      (e.attributes?.friendly_name as string) ||
      e.entity_id.replace(/^sensor\./, '').replace(/_/g, ' ');
    const lower = (e.entity_id + ' ' + friendlyName).toLowerCase();

    const category =
      lower.includes('panel') ? 'Panels' :
      lower.includes('ac') || lower.includes('hvac') || lower.includes('furnace') || lower.includes('climate') ? 'HVAC' :
      lower.includes('charger') || lower.includes('tesla') || lower.includes('ev') || lower.includes('car') ? 'Vehicles' :
      lower.includes('kitchen') || lower.includes('fridge') || lower.includes('oven') || lower.includes('dishwasher') ? 'Kitchen' :
      lower.includes('light') ? 'Lighting' :
      lower.includes('outdoor') || lower.includes('pool') || lower.includes('pump') || lower.includes('gate') || lower.includes('sauna') ? 'Outdoor' :
      'Other';

    discovered.push({
      entityId: e.entity_id,
      powerEntityId,
      label: friendlyName,
      category,
    });
    seen.add(e.entity_id);
  }

  return discovered;
}

export let ENERGY_CIRCUITS: CircuitMeta[] = [];

export function getEnergyCircuits(): CircuitMeta[] {
  if (ENERGY_CIRCUITS.length > 0) return ENERGY_CIRCUITS;
  try {
    const cache = getEntityCache();
    if (cache && cache.length > 0) {
      const discovered = discoverEnergyCircuitsFromEntities(cache);
      if (discovered.length > 0) {
        ENERGY_CIRCUITS = discovered;
        return discovered;
      }
    }
  } catch {}
  return ENERGY_CIRCUITS;
}

export function setEnergyCircuits(circuits: CircuitMeta[]): void {
  ENERGY_CIRCUITS = circuits;
}

export function getPanelMainEnergyEntityIds(): string[] {
  const circuits = getEnergyCircuits();
  return circuits
    .filter(c => c.category === 'Panels' && !c.entityId.includes('balance') && !c.entityId.match(/slot_\d+/))
    .map(c => c.entityId);
}

export function getCanonicalLeafEnergyEntityIds(): string[] {
  const circuits = getEnergyCircuits();
  const mains = new Set(getPanelMainEnergyEntityIds());
  return circuits
    .map(c => c.entityId)
    .filter(id => !mains.has(id));
}

export const PANEL_MAIN_ENERGY_ENTITY_IDS = new Proxy([] as string[], {
  get(target, prop) {
    const ids = getPanelMainEnergyEntityIds();
    if (prop === 'length') return ids.length;
    if (prop === Symbol.iterator) return ids[Symbol.iterator].bind(ids);
    if (typeof prop === 'string' && !isNaN(Number(prop))) return ids[Number(prop)];
    return (ids as any)[prop];
  },
});

export const CANONICAL_LEAF_ENERGY_ENTITY_IDS = new Proxy([] as string[], {
  get(target, prop) {
    const ids = getCanonicalLeafEnergyEntityIds();
    if (prop === 'length') return ids.length;
    if (prop === Symbol.iterator) return ids[Symbol.iterator].bind(ids);
    if (typeof prop === 'string' && !isNaN(Number(prop))) return ids[Number(prop)];
    return (ids as any)[prop];
  },
});

export const CANONICAL_ENERGY_HIERARCHY_IDS = new Proxy([] as string[], {
  get(target, prop) {
    const ids = [...getPanelMainEnergyEntityIds(), ...getCanonicalLeafEnergyEntityIds()];
    if (prop === 'length') return ids.length;
    if (prop === Symbol.iterator) return ids[Symbol.iterator].bind(ids);
    if (typeof prop === 'string' && !isNaN(Number(prop))) return ids[Number(prop)];
    return (ids as any)[prop];
  },
});

// ── Types ──────────────────────────────────────────────────────────────
export interface StatisticsPoint {
  start: string;    // ISO timestamp
  end: string;
  state: number;    // raw sensor value at end of period
  sum: number;      // cumulative total since stats started
  change: number;   // kWh consumed in this period
}

export interface CircuitEnergyData {
  entityId: string;
  label: string;
  category: string;
  totalKwh: number;
  points: StatisticsPoint[];
}

export interface CompleteDailyEnergyStatistics {
  usageDate: string;
  complete: boolean;
  values: Map<string, number>;
  missingEntityIds: string[];
  invalidEntityIds: string[];
}

// ── Fetch statistics from HA ───────────────────────────────────────────

/**
 * Get energy statistics for specified circuits over a time range.
 * Uses HA WebSocket's `recorder/statistics_during_period` message.
 *
 * @param entityIds - Entity IDs to query (must be energy/kWh sensors)
 * @param startTime - ISO timestamp or Date
 * @param endTime - ISO timestamp or Date (optional, defaults to now)
 * @param period - 'hour' | 'day' | 'week' | 'month'
 */
export async function getEnergyStatistics(
  entityIds: string[],
  startTime: Date | string,
  endTime?: Date | string,
  period: 'hour' | 'day' | 'week' | 'month' = 'hour',
): Promise<Record<string, StatisticsPoint[]>> {
  const start = startTime instanceof Date ? startTime.toISOString() : startTime;
  const end = endTime
    ? (endTime instanceof Date ? endTime.toISOString() : endTime)
    : new Date().toISOString();

  try {
    const result = await sendHAWSCommand({
      type: 'recorder/statistics_during_period',
      start_time: start,
      end_time: end,
      statistic_ids: entityIds,
      period,
      types: ['change', 'state', 'sum'],
      units: { energy: 'kWh' },
    }, 30_000);

    return (result as Record<string, StatisticsPoint[]>) ?? {};
  } catch (err) {
    console.error('[haStatistics] Failed to fetch statistics:', err);
    return {};
  }
}

/**
 * Validate one HA daily-statistics response against the canonical hierarchy.
 * A zero is accepted only when HA supplied a real point whose `change` is the
 * finite number zero; absent, malformed, and wrong-day points never become 0.
 */
export function validateCompleteDailyEnergyStatistics(
  stats: Record<string, StatisticsPoint[]>,
  usageDate: string,
  requiredEntityIds: readonly string[] = CANONICAL_ENERGY_HIERARCHY_IDS,
): CompleteDailyEnergyStatistics {
  const values = new Map<string, number>();
  const missingEntityIds: string[] = [];
  const invalidEntityIds: string[] = [];

  for (const entityId of requiredEntityIds) {
    const pointsForDate = (stats[entityId] ?? []).filter(point =>
      typeof point.start === 'string' && laDateString(point.start) === usageDate
    );
    if (pointsForDate.length === 0) {
      missingEntityIds.push(entityId);
      continue;
    }

    let total = 0;
    let valid = true;
    for (const point of pointsForDate) {
      const change: unknown = point.change;
      if (typeof change !== 'number' || !Number.isFinite(change) || change < 0) {
        valid = false;
        break;
      }
      total += change;
    }
    if (!valid) {
      invalidEntityIds.push(entityId);
      continue;
    }
    values.set(entityId, +total.toFixed(4));
  }

  return {
    usageDate,
    complete: missingEntityIds.length === 0 && invalidEntityIds.length === 0,
    values,
    missingEntityIds,
    invalidEntityIds,
  };
}

/**
 * Get total grid consumption (all circuits combined) for a time range.
 */
export async function getGridConsumption(
  startTime: Date,
  endTime?: Date,
  period: 'hour' | 'day' | 'week' | 'month' = 'day',
): Promise<{ totalKwh: number; circuits: CircuitEnergyData[] }> {
  const circuitsList = getEnergyCircuits();
  const entityIds = circuitsList.map(c => c.entityId);
  const stats = await getEnergyStatistics(entityIds, startTime, endTime, period);

  const circuits: CircuitEnergyData[] = [];
  let totalKwh = 0;

  for (const circuit of circuitsList) {
    const points = stats[circuit.entityId] ?? [];
    const circuitKwh = points.reduce((sum, p) => sum + (p.change || 0), 0);
    totalKwh += circuitKwh;
    circuits.push({
      entityId: circuit.entityId,
      label: circuit.label,
      category: circuit.category,
      totalKwh: +circuitKwh.toFixed(3),
      points,
    });
  }

  return { totalKwh: +totalKwh.toFixed(3), circuits };
}

/**
 * Get kWh consumed today so far (since midnight LA time).
 */
export async function getTodayConsumption(): Promise<{ totalKwh: number; circuits: CircuitEnergyData[] }> {
  // Midnight in local estate timezone (auto-discovered from HA Core /api/config or env)
  const tz = getEstateTimezone();
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const d = parts.find(p => p.type === 'day')!.value;
  const midnight = new Date(`${y}-${m}-${d}T00:00:00`);

  return getGridConsumption(midnight, now, 'hour');
}

/**
 * Get kWh consumed this billing cycle so far.
 * LADWP bi-monthly cycles start on approximately the 21st–23rd of every other month.
 * For simplicity, we estimate the cycle start based on the last known cycle boundary.
 */
export function estimateBillingCycleStart(now?: Date): Date {
  const current = now ?? new Date();
  // Known cycle boundaries from bills:
  // 2/23, 4/21, 6/17 (estimated), 8/18, 10/21, 12/22
  // These are ~57-64 day cycles. Approximate by using the known boundaries.
  const boundaries = [
    { month: 0, day: 22 },  // Jan 22 (estimated)
    { month: 1, day: 23 },  // Feb 23
    { month: 3, day: 21 },  // Apr 21
    { month: 5, day: 17 },  // Jun 17
    { month: 7, day: 18 },  // Aug 18
    { month: 9, day: 21 },  // Oct 21
    { month: 11, day: 22 }, // Dec 22
  ];

  const year = current.getFullYear();
  // Find the most recent boundary before 'now'.
  // Build boundary dates at noon UTC so the calendar day is identical in every
  // timezone — the comparison vs `current` is absolute-timestamp based, and
  // downstream (getSeasonalRate via midDate.getMonth()) only cares about the
  // calendar month, which is stable under noon-UTC + PT formatting.
  let best: Date | null = null;
  for (const b of boundaries) {
    for (const y of [year, year - 1]) {
      const candidate = new Date(Date.UTC(y, b.month, b.day, 12));
      if (candidate <= current) {
        if (!best || candidate > best) best = candidate;
      }
    }
  }

  return best ?? new Date(Date.UTC(year, current.getUTCMonth(), 1, 12));
}

/**
 * Get billing-cycle-to-date consumption and cost.
 */
export async function getBillingCycleConsumption(): Promise<{
  cycleStart: Date;
  daysInCycle: number;
  totalKwh: number;
  circuits: CircuitEnergyData[];
}> {
  const cycleStart = estimateBillingCycleStart();
  const now = new Date();
  const daysInCycle = Math.max(1, Math.round((now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)));
  const { totalKwh, circuits } = await getGridConsumption(cycleStart, now, 'day');

  return { cycleStart, daysInCycle, totalKwh, circuits };
}

// ── Robust live-state sources ──────────────────────────────────────────
// The HA recorder/statistics_during_period endpoint is unreliable/empty for
// these Emporia _energy_today sensors, which made the Cost Intelligence view
// show $0 despite a live ~31 kW load. These helpers read the CURRENT STATE of
// the daily total-increasing _energy_today counters from the live entity cache
// (the same source the live-power UI uses) and read completed days from the
// Janus-owned circuit_energy_daily table.

export interface CircuitTodayKwh {
  entityId: string;
  label: string;
  category: string;
  kwh: number;
}

/**
 * Today's kWh per circuit, derived from the current STATE of each
 * sensor.<x>_energy_today counter (resets at LA midnight, total_increasing).
 * Reads from the live HA WS entity cache — no recorder query involved.
 */
export function getTodayConsumptionFromStates(): {
  totalKwh: number;
  circuits: CircuitTodayKwh[];
} {
  const cache = getEntityCache();
  const byId = new Map(cache.map(e => [e.entity_id, e]));

  const circuits: CircuitTodayKwh[] = [];
  let totalKwh = 0;
  const circuitsList = getEnergyCircuits();

  for (const circuit of circuitsList) {
    const entity = byId.get(circuit.entityId);
    const raw = entity ? parseFloat(entity.state) : NaN;
    const kwh = Number.isFinite(raw) && raw >= 0 ? raw : 0;
    totalKwh += kwh;
    circuits.push({
      entityId: circuit.entityId,
      label: circuit.label,
      category: circuit.category,
      kwh: +kwh.toFixed(3),
    });
  }

  return { totalKwh: +totalKwh.toFixed(3), circuits };
}

/**
 * Per-circuit kWh for completed days of the current billing cycle, summed from
 * the circuit_energy_daily table. Excludes today (which is read live from
 * _energy_today state and added separately) to avoid double counting.
 */
export async function getCycleConsumptionFromDb(cycleStart: Date): Promise<{
  totalKwh: number;
  circuits: CircuitTodayKwh[];
  daysWithData: number;
  coveredDates: string[];
}> {
  // Local date strings for the cycle window [cycleStart, today).
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: getEstateTimezone(), year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const cycleStartDate = fmt.format(cycleStart);     // YYYY-MM-DD
  const todayDate = fmt.format(new Date());

  const circuitsList = getEnergyCircuits();
  const labelById = new Map(circuitsList.map(c => [c.entityId, c]));
  const circuits: CircuitTodayKwh[] = [];
  let totalKwh = 0;
  let daysWithData = 0;
  const coveredDates: string[] = [];

  try {
    const { rows } = await query<{ entity_id: string; label: string | null; category: string | null; kwh: string | number | null; days: number }>(
      `SELECT entity_id, MAX(label) AS label, MAX(category) AS category,
              SUM(kwh) AS kwh, COUNT(DISTINCT usage_date) AS days
       FROM circuit_energy_daily
       WHERE usage_date >= $1::date AND usage_date < $2::date
       GROUP BY entity_id`,
      [cycleStartDate, todayDate],
    );

    let maxDays = 0;
    for (const r of rows) {
      const meta = labelById.get(r.entity_id);
      const kwh = Number(r.kwh) || 0;
      totalKwh += kwh;
      maxDays = Math.max(maxDays, Number(r.days) || 0);
      circuits.push({
        entityId: r.entity_id,
        label: meta?.label ?? r.label ?? r.entity_id,
        category: meta?.category ?? r.category ?? 'Other',
        kwh: +kwh.toFixed(3),
      });
    }
    daysWithData = maxDays;

    // Which LA-local dates does the DB actually cover? Used so the HA-stats
    // fallback only fills the elapsed days the DB is MISSING (no double count).
    if (rows.length > 0) {
      const { rows: dateRows } = await query<{ d: string | null }>(
        `SELECT DISTINCT to_char(usage_date, 'YYYY-MM-DD') AS d
         FROM circuit_energy_daily
         WHERE usage_date >= $1::date AND usage_date < $2::date
         ORDER BY d`,
        [cycleStartDate, todayDate],
      );
      for (const dr of dateRows) if (dr.d) coveredDates.push(dr.d);
    }
  } catch (err) {
    console.warn('[haStatistics] getCycleConsumptionFromDb failed:', err instanceof Error ? err.message : err);
  }

  return { totalKwh: +totalKwh.toFixed(3), circuits, daysWithData, coveredDates };
}

/**
 * Map an ISO timestamp (a statistics period start) to its LA-local calendar
 * date string (YYYY-MM-DD). HA returns day-period buckets aligned to local
 * midnight, so this groups each `change` to the day it belongs to.
 */
function laDateString(iso: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: getEstateTimezone(), year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date(iso));
}

/**
 * Per-circuit kWh for ELAPSED cycle days that circuit_energy_daily does NOT yet
 * cover, recovered from HA long-term statistics (recorder/statistics_during_period
 * with day periods). HA retains these statistics for the _energy_today sensors
 * long after the recorder's short-term purge, so the elapsed days are
 * recoverable even when the Janus snapshot table is empty.
 *
 * Returns per-circuit summed kWh over the filled days plus the set of local
 * dates that were actually filled (so the daily-average denominator can count
 * real elapsed days, not a stale row count). `excludeDates` are days already in
 * the DB; `excludeToday` is the current local date (read live elsewhere). Both are
 * skipped to avoid double-counting.
 */
export async function getCycleConsumptionFromStats(
  cycleStart: Date,
  excludeDates: Set<string>,
  excludeToday: string,
): Promise<{ circuits: CircuitTodayKwh[]; filledDates: string[] }> {
  const circuitsList = getEnergyCircuits();
  const labelById = new Map(circuitsList.map(c => [c.entityId, c]));
  const perCircuit = new Map<string, number>();
  const filled = new Set<string>();

  try {
    const entityIds = circuitsList.map(c => c.entityId);
    // Query [cycleStart, now); HA buckets by local day. We then drop any day the
    // DB already owns and today (live), summing only the genuinely-missing days.
    const stats = await getEnergyStatistics(entityIds, cycleStart, new Date(), 'day');

    for (const circuit of circuitsList) {
      const points = stats[circuit.entityId] ?? [];
      let kwh = 0;
      for (const p of points) {
        if (!p.start) continue;
        const day = laDateString(p.start);
        if (excludeDates.has(day) || day === excludeToday) continue;
        if (day < laDateString(cycleStart.toISOString())) continue;
        const change = Number(p.change) || 0;
        if (change <= 0) continue;
        kwh += change;
        filled.add(day);
      }
      if (kwh > 0) perCircuit.set(circuit.entityId, +kwh.toFixed(3));
    }
  } catch (err) {
    console.warn('[haStatistics] getCycleConsumptionFromStats failed:', err instanceof Error ? err.message : err);
  }

  const circuits: CircuitTodayKwh[] = [];
  for (const [entityId, kwh] of perCircuit) {
    const meta = labelById.get(entityId);
    circuits.push({
      entityId,
      label: meta?.label ?? entityId,
      category: meta?.category ?? 'Other',
      kwh,
    });
  }

  return { circuits, filledDates: Array.from(filled) };
}

/**
 * Robust per-circuit cycle-to-date kWh:
 *   completed days from circuit_energy_daily
 *   + elapsed days the DB is missing, recovered from HA long-term statistics
 *   + today's partial from live _energy_today state.
 * This is the authoritative source for the Cost Intelligence breakdown and Top
 * Consumers. It stays correct even when circuit_energy_daily is brand-new/empty,
 * because the HA-stats fallback fills every elapsed cycle day the DB lacks.
 *
 * `daysWithData` reflects the number of ELAPSED cycle days actually covered
 * (distinct DB days ∪ stats-filled days, + 1 for today) so daily-average math
 * divides by real elapsed days rather than a stale count.
 */
export async function getCycleConsumptionRobust(cycleStart: Date): Promise<{
  totalKwh: number;
  circuits: CircuitTodayKwh[];
  daysWithData: number;
  source: 'db+live' | 'db+stats+live' | 'stats+live' | 'live-only';
}> {
  const db = await getCycleConsumptionFromDb(cycleStart);
  const today = getTodayConsumptionFromStates();

  const todayDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: getEstateTimezone(), year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  const dbDates = new Set(db.coveredDates);
  // Fill elapsed cycle days the DB does not cover from HA long-term statistics.
  const stats = await getCycleConsumptionFromStats(cycleStart, dbDates, todayDate);

  const merged = new Map<string, CircuitTodayKwh>();
  const add = (c: CircuitTodayKwh) => {
    const existing = merged.get(c.entityId);
    if (existing) existing.kwh = +(existing.kwh + c.kwh).toFixed(3);
    else merged.set(c.entityId, { ...c });
  };

  for (const c of db.circuits) add(c);
  for (const c of stats.circuits) add(c);
  for (const t of today.circuits) add(t);

  // Ensure every known circuit is represented (even at 0) for a stable UI.
  const allCircuits = getEnergyCircuits();
  for (const circuit of allCircuits) {
    if (!merged.has(circuit.entityId)) {
      merged.set(circuit.entityId, {
        entityId: circuit.entityId, label: circuit.label,
        category: circuit.category, kwh: 0,
      });
    }
  }

  const circuits = Array.from(merged.values());
  const totalKwh = +circuits.reduce((s, c) => s + c.kwh, 0).toFixed(3);

  // Elapsed days covered: distinct DB days + distinct stats-filled days + today.
  const coveredElapsed = new Set<string>([...dbDates, ...stats.filledDates]);
  const daysWithData = coveredElapsed.size + 1; // + today (partial)

  const hasDb = db.totalKwh > 0;
  const hasStats = stats.circuits.length > 0;
  let source: 'db+live' | 'db+stats+live' | 'stats+live' | 'live-only';
  if (hasDb && hasStats) source = 'db+stats+live';
  else if (hasDb) source = 'db+live';
  else if (hasStats) source = 'stats+live';
  else source = 'live-only';

  return { totalKwh, circuits, daysWithData, source };
}
