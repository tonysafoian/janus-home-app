import WebSocket from 'ws';
import { emitToAll } from '../socket.js';
import { logAudit } from './auditLog.js';
import { query } from './db.js';

interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

interface HAStateChangedEvent {
  entity_id: string;
  new_state: HAEntity | null;
  old_state: HAEntity | null;
}

let entityCache: Map<string, HAEntity> = new Map();
let goveeEntityIdsCache: string[] = [];
let wsClient: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let msgId = 1;
let cacheReady = false;
let goveeTemplateId: number | null = null;

// ── Crestron bridge health watcher ────────────────────────────────────
const CRESTRON_EXCLUDED_LIGHT_PATTERN = /pool_light|spa_light|laminar_led/i;
const CRESTRON_OFFLINE_THRESHOLD = 0.2;
const CRESTRON_DEDUP_MINUTES = 30;

let crestronBridgeState: 'healthy' | 'offline' | 'unknown' = 'unknown';
let crestronCheckTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleCrestronCheck() {
  if (crestronCheckTimer) return;
  crestronCheckTimer = setTimeout(() => {
    crestronCheckTimer = null;
    checkCrestronBridge().catch(e => console.error('[Crestron] Bridge check error:', e));
  }, 2_000);
}

async function checkCrestronBridge() {
  const allEntities = Array.from(entityCache.values());
  const lights = allEntities.filter(e =>
    e.entity_id.startsWith('light.') &&
    !CRESTRON_EXCLUDED_LIGHT_PATTERN.test(e.entity_id) &&
    !goveeEntityIdsCache.includes(e.entity_id),
  );
  if (lights.length === 0) return;

  const unavailable = lights.filter(e => e.state === 'unavailable').length;
  const pct = unavailable / lights.length;
  const newState: 'healthy' | 'offline' = pct >= CRESTRON_OFFLINE_THRESHOLD ? 'offline' : 'healthy';

  if (crestronBridgeState === 'unknown') {
    crestronBridgeState = newState;
    return;
  }
  if (newState === crestronBridgeState) return;

  const prevState = crestronBridgeState;
  crestronBridgeState = newState;
  console.log(`[Crestron] Bridge state: ${prevState} → ${newState} (${unavailable}/${lights.length} unavailable)`);
  await fireCrestronAlert(newState, unavailable, lights.length);
}

async function fireCrestronAlert(state: 'healthy' | 'offline', unavailable: number, total: number) {
  const alertKey = state === 'offline' ? 'crestron_bridge_offline' : 'crestron_bridge_recovered';

  try {
    const { rows } = await query(
      `SELECT id FROM system_audit_log WHERE event_type = 'crestron_alert' AND detail->>'alert_key' = $1 AND created_at > NOW() - INTERVAL '${CRESTRON_DEDUP_MINUTES} minutes' LIMIT 1`,
      [alertKey],
    );
    if (rows.length > 0) {
      console.log(`[Crestron] Alert "${alertKey}" suppressed by dedup (within ${CRESTRON_DEDUP_MINUTES} min)`);
      return;
    }
  } catch (e) {
    console.error('[Crestron] Dedup query failed:', e);
  }

  const summary = state === 'offline'
    ? `Crestron bridge offline: ${unavailable}/${total} lights unavailable (${Math.round(unavailable / total * 100)}%)`
    : `Crestron bridge recovered: lights back online (${total} total)`;

  await logAudit('crestron-bridge-monitor', {
    category: 'crestron_bridge',
    event_type: 'crestron_alert',
    severity: state === 'offline' ? 'warn' : 'info',
    actor_id: 'system',
    actor_name: 'Crestron Bridge Monitor',
    channel: 'system',
    summary,
    detail: {
      alert_key: alertKey,
      unavailable,
      total,
      pct: Math.round(unavailable / total * 100),
    },
    status: state === 'offline' ? 'error' : 'success',
  });

  try {
    const { getAlertPhoneNumber, sendWhatsAppTo } = await import('./helpers.js');
    const phone = await getAlertPhoneNumber();
    const msg = state === 'offline'
      ? `🔴 *Crestron Home bridge offline*\n${unavailable}/${total} lights are unavailable. Open Janus → Home Lights to reload.`
      : `✅ *Crestron Home bridge recovered*\nUnavailable lights dropped below threshold (${unavailable}/${total} still offline).`;
    await sendWhatsAppTo(phone, msg);
  } catch (e) {
    console.error('[Crestron] WhatsApp alert failed:', e);
  }
}

type PendingCallback = (msg: { success: boolean; result?: unknown; error?: { message?: string } }) => void;
const pendingCallbacks = new Map<number, PendingCallback>();

const MAX_RECONNECT_DELAY = 60_000;
const SAFETY_SYNC_INTERVAL = 24 * 60 * 60 * 1000;
let safetySyncTimer: ReturnType<typeof setInterval> | null = null;

function nextId() {
  return msgId++;
}

function send(ws: WebSocket, msg: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function getEntityCache(): HAEntity[] {
  return Array.from(entityCache.values());
}

export function getGoveeEntityIdsFromCache(): string[] {
  return goveeEntityIdsCache;
}

export function isCacheReady(): boolean {
  return cacheReady;
}

export interface HAUser {
  id: string;
  name: string;
  username?: string;
  is_owner?: boolean;
  is_admin?: boolean;
  group_ids?: string[];
}

const haUsersCache: Map<string, HAUser> = new Map();
const haUsersByNameCache: Map<string, HAUser> = new Map();

export async function refreshHAUsers(): Promise<HAUser[]> {
  try {
    const result = await sendHAWSCommand({ type: 'config/auth/list' }, 5000);
    if (Array.isArray(result)) {
      haUsersCache.clear();
      haUsersByNameCache.clear();
      for (const u of result as HAUser[]) {
        if (u.id) haUsersCache.set(u.id, u);
        if (u.name) haUsersByNameCache.set(u.name.toLowerCase().trim(), u);
        if (u.username) haUsersByNameCache.set(u.username.toLowerCase().trim(), u);
      }
      console.log(`[HA-WS] Successfully synced ${haUsersCache.size} Home Assistant users for RBAC`);
      return result as HAUser[];
    }
  } catch (err) {
    console.warn('[HA-WS] Could not fetch config/auth/list:', err instanceof Error ? err.message : err);
  }
  return [];
}

export function isHAUserAdminSync(userId?: string, userName?: string): boolean {
  if (userId) {
    const cleanId = userId.replace(/^ha:/, '');
    const user = haUsersCache.get(cleanId);
    if (user) {
      return Boolean(user.is_owner || user.is_admin || user.group_ids?.includes('system-admin'));
    }
  }
  if (userName) {
    const normalizedName = userName.toLowerCase().trim();
    const user = haUsersByNameCache.get(normalizedName);
    if (user) {
      return Boolean(user.is_owner || user.is_admin || user.group_ids?.includes('system-admin'));
    }
    const configuredAdmin = process.env.ADMIN_USER_NAME?.toLowerCase().trim();
    if (configuredAdmin && normalizedName === configuredAdmin) {
      return true;
    }
  }
  return false;
}

export async function syncPersonsFromHA(): Promise<void> {
  const persons = Array.from(entityCache.values()).filter(e => e.entity_id.startsWith('person.'));
  if (persons.length === 0) return;

  try {
    const { query } = await import('./db.js');
    let realCount = 0;
    for (const p of persons) {
      const friendlyName = (p.attributes?.friendly_name as string) || p.entity_id.replace('person.', '').replace(/_/g, ' ');
      if (!friendlyName || friendlyName.toLowerCase().includes('demo') || friendlyName.toLowerCase().includes('admin user')) continue;

      const userId = p.attributes?.user_id as string | undefined;
      const isAdmin = isHAUserAdminSync(userId, friendlyName);
      const role = isAdmin ? 'admin' : 'member';

      // Check if person already exists by display_name
      const { rows } = await query<{ id: string }>(
        `SELECT id FROM household_members WHERE LOWER(display_name) = LOWER($1) LIMIT 1`,
        [friendlyName]
      );
      if (rows.length === 0) {
        await query(
          `INSERT INTO household_members (display_name, role, is_active, aliases)
           VALUES ($1, $2, true, $3)`,
          [friendlyName, role, [p.entity_id]]
        );
        realCount++;
      }
    }

    if (realCount > 0) {
      console.log(`[HA-WS] Synced ${realCount} real person(s) from Home Assistant into household_members`);
      // Deactivate generic placeholder accounts if real members were added
      await query(
        `UPDATE household_members SET is_active = false
         WHERE id IN ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003')`
      );
    }
  } catch (err) {
    console.warn('[HA-WS] syncPersonsFromHA failed:', err instanceof Error ? err.message : err);
  }
}

export interface AreaRegistryItem {
  area_id: string;
  name: string;
  picture?: string | null;
  icon?: string | null;
  floor_id?: string | null;
  aliases?: string[];
}

export interface DeviceRegistryItem {
  id: string;
  area_id?: string | null;
  name?: string | null;
  name_by_user?: string | null;
}

export interface EntityRegistryItem {
  entity_id: string;
  area_id?: string | null;
  device_id?: string | null;
  name?: string | null;
  original_name?: string | null;
  icon?: string | null;
  disabled_by?: string | null;
}

let areaCache: AreaRegistryItem[] = [];
let deviceCache: Map<string, DeviceRegistryItem> = new Map();
let entityRegistryCache: Map<string, EntityRegistryItem> = new Map();

export async function refreshHAAreas(): Promise<AreaRegistryItem[]> {
  try {
    const [areas, devices, entities] = await Promise.all([
      sendHAWSCommand({ type: 'config/area_registry/list' }, 10000).catch(() => []),
      sendHAWSCommand({ type: 'config/device_registry/list' }, 10000).catch(() => []),
      sendHAWSCommand({ type: 'config/entity_registry/list' }, 10000).catch(() => []),
    ]) as [any, any, any];

    if (Array.isArray(areas)) {
      areaCache = areas as AreaRegistryItem[];
    }
    if (Array.isArray(devices)) {
      deviceCache.clear();
      for (const d of devices as DeviceRegistryItem[]) {
        if (d.id) deviceCache.set(d.id, d);
      }
    }
    if (Array.isArray(entities)) {
      entityRegistryCache.clear();
      for (const e of entities as EntityRegistryItem[]) {
        if (e.entity_id && !e.disabled_by) {
          entityRegistryCache.set(e.entity_id, e);
        }
      }
    }
    console.log(`[HA-WS] Synced ${areaCache.length} areas, ${deviceCache.size} devices, ${entityRegistryCache.size} entities from registry`);
    return areaCache;
  } catch (err) {
    console.warn('[HA-WS] Failed to refresh HA areas registry:', err);
    return areaCache;
  }
}

export interface AreaWithEntities extends AreaRegistryItem {
  entities: Array<{
    entity_id: string;
    name: string;
    state?: string;
    domain: string;
    attributes?: Record<string, unknown>;
  }>;
}

export function getAreasWithEntities(): AreaWithEntities[] {
  const areaEntityMap = new Map<string, AreaWithEntities['entities']>();
  for (const a of areaCache) {
    areaEntityMap.set(a.area_id, []);
  }

  for (const [entityId, reg] of entityRegistryCache.entries()) {
    let targetAreaId = reg.area_id;
    if (!targetAreaId && reg.device_id) {
      const dev = deviceCache.get(reg.device_id);
      if (dev?.area_id) targetAreaId = dev.area_id;
    }

    if (targetAreaId && areaEntityMap.has(targetAreaId)) {
      const live = entityCache.get(entityId);
      const domain = entityId.split('.')[0];
      const friendlyName = (live?.attributes?.friendly_name as string) || reg.name || reg.original_name || entityId;
      areaEntityMap.get(targetAreaId)!.push({
        entity_id: entityId,
        name: friendlyName,
        state: live?.state,
        domain,
        attributes: live?.attributes,
      });
    }
  }

  return areaCache.map(area => ({
    ...area,
    entities: (areaEntityMap.get(area.area_id) || []).sort((a, b) => a.name.localeCompare(b.name)),
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export function sendHAWSCommand(command: Record<string, unknown>, timeoutMs = 30_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      reject(new Error('HA WebSocket not connected'));
      return;
    }
    const id = nextId();
    const timer = setTimeout(() => {
      pendingCallbacks.delete(id);
      reject(new Error('HA WebSocket command timed out'));
    }, timeoutMs);

    pendingCallbacks.set(id, (msg) => {
      clearTimeout(timer);
      pendingCallbacks.delete(id);
      if (msg.success) {
        resolve(msg.result);
      } else {
        reject(new Error(msg.error?.message || 'HA command failed'));
      }
    });

    send(wsClient, { ...command, id });
  });
}

export async function callHAService(
  domain: string,
  service: string,
  serviceData: Record<string, unknown> = {}
): Promise<unknown> {
  return sendHAWSCommand({
    type: 'call_service',
    domain,
    service,
    service_data: serviceData,
  });
}

export function startHAWebSocket(): void {
  const supervisorToken = process.env.SUPERVISOR_TOKEN || process.env.HASSIO_TOKEN;
  const HA_URL = process.env.HA_URL || (supervisorToken ? 'http://supervisor/core' : undefined);
  const HA_TOKEN = process.env.HA_TOKEN || supervisorToken;

  if (!HA_URL || !HA_TOKEN) {
    console.log('[HA-WS] HA_URL or HA_TOKEN not configured — skipping WebSocket connection');
    return;
  }

  const isSupervisor = HA_URL.includes('supervisor');
  const wsUrl = isSupervisor
    ? HA_URL.replace(/^http(s?)/, 'ws$1').replace(/\/$/, '') + '/websocket'
    : HA_URL.replace(/^http(s?)/, 'ws$1').replace(/\/$/, '') + '/api/websocket';
  console.log(`[HA-WS] Connecting to ${wsUrl}`);

  try {
    wsClient = new WebSocket(wsUrl);
  } catch (err) {
    console.error('[HA-WS] Failed to create WebSocket:', err);
    scheduleReconnect();
    return;
  }

  wsClient.on('open', () => {
    console.log('[HA-WS] Connected');
    reconnectDelay = 1000;
  });

  wsClient.on('message', (raw: WebSocket.RawData) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const type = msg.type as string;

    if (type === 'auth_required') {
      send(wsClient!, { type: 'auth', access_token: HA_TOKEN });
      return;
    }

    if (type === 'auth_ok') {
      console.log('[HA-WS] Authenticated — fetching all states');
      msgId = 1;

      const statesId = nextId();
      send(wsClient!, { id: statesId, type: 'get_states' });

      // Refresh Home Assistant users for RBAC role verification
      refreshHAUsers().catch(e => console.warn('[HA-WS] User list fetch failed:', e));
      // Refresh Area, Device, and Entity registries for Area view
      refreshHAAreas().catch(e => console.warn('[HA-WS] Area registry fetch failed:', e));

      const subId = nextId();
      send(wsClient!, { id: subId, type: 'subscribe_events', event_type: 'state_changed' });

      if (safetySyncTimer) clearInterval(safetySyncTimer);
      safetySyncTimer = setInterval(() => {
        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
          console.log('[HA-WS] Safety sync: refreshing all states from HA');
          send(wsClient, { id: nextId(), type: 'get_states' });
          refreshHAUsers().then(() => syncPersonsFromHA()).catch(() => {});
          refreshHAAreas().catch(() => {});
        }
      }, SAFETY_SYNC_INTERVAL);

      return;
    }

    if (type === 'auth_invalid') {
      console.error('[HA-WS] Auth failed — invalid token');
      logAudit('ha-websocket', {
        category: 'home', event_type: 'ha_ws_auth_invalid', severity: 'critical',
        actor_id: 'system', actor_name: 'System', channel: 'system',
        summary: 'HA WebSocket authentication failed — token may be invalid',
        detail: {},
        status: 'error',
      });
      wsClient?.close();
      return;
    }

    if (type === 'result') {
      const result = msg as { id: number; success: boolean; result: unknown; error?: { message?: string } };

      const cb = pendingCallbacks.get(result.id);
      if (cb) {
        cb({ success: result.success, result: result.result, error: result.error });
        return;
      }

      if (result.success && Array.isArray(result.result)) {
        const states = result.result as HAEntity[];
        entityCache.clear();
        for (const entity of states) {
          entityCache.set(entity.entity_id, entity);
        }
        cacheReady = true;
        console.log(`[HA-WS] Loaded ${states.length} entity states into cache`);
        syncPersonsFromHA().catch(e => console.warn('[HA-WS] Person sync failed:', e));
        // Note: we defer the initial Crestron bridge check until after Govee IDs
        // have been resolved so Govee lights are properly excluded from the count.

        goveeTemplateId = nextId();
        // Query all Govee integration variants in a single template render so that
        // entities discovered under govee_cloud, govee_ble, or govee_light_local are
        // included alongside those under the plain 'govee' domain.
        send(wsClient!, {
          id: goveeTemplateId,
          type: 'render_template',
          template: "{{ (integration_entities('govee') + integration_entities('govee_cloud') + integration_entities('govee_ble') + integration_entities('govee_light_local')) | unique | list | to_json }}",
        });
      }
      return;
    }

    if (type === 'event' && msg.id === goveeTemplateId) {
      const listeners = (msg.event as Record<string, unknown>) ?? {};
      const eventResult = listeners.result;
      if (eventResult) {
        try {
          let ids: string[];
          if (Array.isArray(eventResult)) {
            ids = eventResult;
          } else if (typeof eventResult === 'string') {
            const jsonFixed = eventResult.replace(/'/g, '"');
            ids = JSON.parse(jsonFixed);
          } else {
            ids = [];
          }
          if (Array.isArray(ids) && ids.length > 0) {
            goveeEntityIdsCache = ids;
            console.log(`[HA-WS] Cached ${ids.length} Govee entity IDs`);
          }
          // Now that Govee IDs are known, establish the initial Crestron bridge baseline
          scheduleCrestronCheck();
        } catch (e) {
          console.warn('[HA-WS] Failed to parse Govee template result:', (e as Error).message);
        }
      }
      return;
    }

    if (type === 'event') {
      const event = msg.event as { data?: HAStateChangedEvent; event_type?: string } | undefined;
      if (!event || event.event_type !== 'state_changed' || !event.data) return;

      const { entity_id, new_state } = event.data;
      if (new_state) {
        entityCache.set(entity_id, new_state);
        emitToAll('ha:state_changed', { entity_id, new_state });
      } else {
        entityCache.delete(entity_id);
        emitToAll('ha:state_changed', { entity_id, new_state: null });
      }
      if (entity_id.startsWith('light.')) scheduleCrestronCheck();
      return;
    }
  });

  wsClient.on('close', (code: number, reason: Buffer) => {
    console.warn(`[HA-WS] Disconnected (code=${code} reason=${reason.toString() || 'none'}) — reconnecting in ${reconnectDelay}ms`);
    cacheReady = false;
    wsClient = null;
    if (safetySyncTimer) {
      clearInterval(safetySyncTimer);
      safetySyncTimer = null;
    }
    scheduleReconnect();
  });

  wsClient.on('error', (err: Error) => {
    console.error(`[HA-WS] Error: ${err.message}`);
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    startHAWebSocket();
  }, reconnectDelay);
}

export function stopHAWebSocket(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (safetySyncTimer) {
    clearInterval(safetySyncTimer);
    safetySyncTimer = null;
  }
  if (wsClient) {
    wsClient.removeAllListeners();
    wsClient.close();
    wsClient = null;
  }
  entityCache.clear();
  cacheReady = false;
}
