import { useMemo } from 'react';
import { HAEntity } from '@/lib/api/homeAssistant';
import { useSharedHAAllEntities } from '@/hooks/useHAEntitiesContext';

export interface PoolEntityMap {
  poolTemp: string;
  spaTemp: string;
  airTemp: string;
  poolClimate: string;
  spaClimate: string;
  poolLight: string;
  spaLight: string;
  laminarLed: string;
  poolPump: string;
  spaPump: string;
  boosterPump: string;
  poolHeater: string;
  spaHeater: string;
  solarHeater: string;
  laminarJets: string;
  bubbler: string;
  freezeProtection: string;
}

function findPoolEntity(allEntities: HAEntity[], domain: string, keywords: string[]): string {
  const match = allEntities.find(e =>
    e.entity_id.startsWith(`${domain}.`) &&
    keywords.every(kw => e.entity_id.toLowerCase().includes(kw))
  );
  return match?.entity_id || '';
}

export const LIGHT_EFFECTS = [
  'Alpine White', 'Sky Blue', 'Cobalt Blue', 'Caribbean Blue',
  'Spring Green', 'Emerald Green', 'Emerald Rose', 'Magenta',
  'Violet', 'Slow Splash', 'Fast Splash', 'USA!', 'Fat Tuesday', 'Disco Tech',
];

function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * 5) / 9);
}

function isCelsius(unit: string | undefined | null): boolean {
  if (!unit) return false;
  const normalized = unit.trim().toLowerCase();
  return normalized === '°c' || normalized === 'c' || normalized === 'celsius';
}

function getTempInFahrenheit(entity: HAEntity | undefined): string | null {
  if (!entity) return null;
  const raw = entity.state;
  if (!raw || raw === 'unknown' || raw === 'unavailable') return null;
  const num = parseFloat(raw);
  if (isNaN(num)) return null;
  const unit = (entity.attributes?.unit_of_measurement ?? '').toString().trim().toLowerCase();
  if ((unit === '°f' || unit === 'f') && num > 150) {
    return String(Math.round((num - 32) * 5 / 9));
  }
  if (unit === '°c' || unit === 'c') {
    return String(celsiusToFahrenheit(num));
  }
  return String(Math.round(num));
}

function getSetPointInFahrenheit(entity: HAEntity | undefined): string | null {
  if (!entity) return null;
  const temp = entity.attributes?.temperature;
  if (temp == null) return null;
  const num = typeof temp === 'number' ? temp : parseFloat(String(temp));
  if (isNaN(num)) return null;
  const unit = (entity.attributes?.temperature_unit ?? entity.attributes?.unit_of_measurement ?? '').toString().trim().toLowerCase();
  if ((unit === '°f' || unit === 'f') && num > 150) {
    return String(Math.round((num - 32) * 5 / 9));
  }
  if (unit === '°c' || unit === 'c') {
    return String(celsiusToFahrenheit(num));
  }
  return String(Math.round(num));
}

function getClimateUnit(entity: HAEntity | undefined): string {
  if (!entity) return '°F';
  const unit = entity.attributes?.temperature_unit as string | undefined;
  const unitOfMeasurement = entity.attributes?.unit_of_measurement as string | undefined;
  return unit || unitOfMeasurement || '°F';
}

export interface IaqualinkHA {
  loading: boolean;
  connected: boolean;
  entities: Map<string, HAEntity>;
  entityIds: PoolEntityMap;
  temperatures: {
    pool: string | null;
    spa: string | null;
    air: string | null;
    poolSetPoint: string | null;
    spaSetPoint: string | null;
  };
  climateUnits: {
    pool: string;
    spa: string;
  };
  freezeProtection: boolean;
  refetch: (silent?: boolean) => Promise<void>;
}

export function useIaqualinkHA(_refreshInterval = 30000): IaqualinkHA {
  const { allEntities, loading, refetch } = useSharedHAAllEntities();

  const entityIds: PoolEntityMap = useMemo(() => ({
    poolTemp: findPoolEntity(allEntities, 'sensor', ['pool', 'temp']),
    spaTemp: findPoolEntity(allEntities, 'sensor', ['spa', 'temp']),
    airTemp: findPoolEntity(allEntities, 'sensor', ['air', 'temp']),
    poolClimate: findPoolEntity(allEntities, 'climate', ['pool']),
    spaClimate: findPoolEntity(allEntities, 'climate', ['spa']),
    poolLight: findPoolEntity(allEntities, 'light', ['pool']),
    spaLight: findPoolEntity(allEntities, 'light', ['spa']),
    laminarLed: findPoolEntity(allEntities, 'light', ['laminar']),
    poolPump: findPoolEntity(allEntities, 'switch', ['pool', 'pump']),
    spaPump: findPoolEntity(allEntities, 'switch', ['spa', 'pump']),
    boosterPump: findPoolEntity(allEntities, 'switch', ['booster']),
    poolHeater: findPoolEntity(allEntities, 'switch', ['pool', 'heater']),
    spaHeater: findPoolEntity(allEntities, 'switch', ['spa', 'heater']),
    solarHeater: findPoolEntity(allEntities, 'switch', ['solar', 'heater']),
    laminarJets: findPoolEntity(allEntities, 'switch', ['laminar']),
    bubbler: findPoolEntity(allEntities, 'switch', ['bubbler']),
    freezeProtection: findPoolEntity(allEntities, 'binary_sensor', ['freeze']),
  }), [allEntities]);

  const activeIds = useMemo(() => new Set(Object.values(entityIds).filter(Boolean)), [entityIds]);

  const entities = useMemo(() => {
    const map = new Map<string, HAEntity>();
    for (const e of allEntities) {
      if (activeIds.has(e.entity_id)) {
        map.set(e.entity_id, e);
      }
    }
    return map;
  }, [allEntities, activeIds]);

  const connected = !loading && entities.size > 0;

  const temperatures = useMemo(() => ({
    pool: getTempInFahrenheit(entities.get(entityIds.poolTemp)),
    spa: getTempInFahrenheit(entities.get(entityIds.spaTemp)),
    air: getTempInFahrenheit(entities.get(entityIds.airTemp)),
    poolSetPoint: getSetPointInFahrenheit(entities.get(entityIds.poolClimate)),
    spaSetPoint: getSetPointInFahrenheit(entities.get(entityIds.spaClimate)),
  }), [entities, entityIds]);

  const climateUnits = useMemo(() => ({
    pool: getClimateUnit(entities.get(entityIds.poolClimate)),
    spa: getClimateUnit(entities.get(entityIds.spaClimate)),
  }), [entities, entityIds]);

  const freezeProtection = entities.get(entityIds.freezeProtection)?.state === 'on';

  return {
    loading,
    connected,
    entities,
    entityIds,
    temperatures,
    climateUnits,
    freezeProtection,
    refetch,
  };
}

export { celsiusToFahrenheit, fahrenheitToCelsius, isCelsius };
