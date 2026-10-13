import { describe, it, expect } from 'vitest';
import {
  WORKFLOW_RULES,
  resolveWorkflow,
  type HAEntityLike,
  type ResolvedWorkflow,
} from '../../../shared/workflowRules';

// ── Test fixtures ─────────────────────────────────────────────────────────
// The garage-recessed-group rule is the most fallback-sensitive rule: it
// resolves same-room Crestron cabinets (always light.*) plus the Govee
// garage accent LED, which may be exposed as light.*, switch.*, or both. The
// light→switch fallback and the offline computation are the subtle parts.

const RULE = WORKFLOW_RULES.find((r) => r.id === 'garage-recessed-group')!;

function entity(
  entity_id: string,
  state: string,
  friendly_name?: string,
): HAEntityLike {
  return {
    entity_id,
    state,
    attributes: friendly_name ? { friendly_name } : {},
  };
}

// The garage recessed trigger + the two same-room cabinets, always healthy
// across every scenario so we can isolate the accent fallback behavior.
function baseEntities(): HAEntityLike[] {
  return [
    entity('light.garage_recessed', 'on', 'Garages — Recessed'),
    entity('light.garage_north_cabinets', 'off', 'North Cabinets'),
    entity('light.garage_tool_cabinets', 'off', 'Tool Cabinets'),
  ];
}

// Mirror of the offlineEntities filter in
// src/components/automations/WorkflowTriggersSection.tsx — the UI surface this
// test is guarding. If that filter changes, this must change in lockstep.
function computeOfflineEntities(
  resolved: ResolvedWorkflow,
  allEntities: HAEntityLike[],
): string[] {
  const ids = [resolved.triggerEntityId, ...(resolved.targetEntityIds || [])];
  return ids.filter((id) => {
    if (resolved.fallbackEntityIds.includes(id)) return false;
    const e = allEntities.find((x) => x.entity_id === id);
    return !!e && (e.state === 'unavailable' || e.state === 'unknown');
  });
}

describe('resolveWorkflow — garage-recessed-group fallback & offline detection', () => {
  it('all healthy: resolves light targets with no fallback and nothing offline', () => {
    const entities = [
      ...baseEntities(),
      entity('light.garage_accent', 'on', 'Garage Accent LED (Govee)'),
    ];

    const resolved = resolveWorkflow(RULE, entities);
    expect(resolved).not.toBeNull();

    expect(resolved!.targetEntityIds).toEqual([
      'light.garage_north_cabinets',
      'light.garage_tool_cabinets',
      'light.garage_accent',
    ]);
    expect(resolved!.fallbackEntityIds).toEqual([]);
    expect(computeOfflineEntities(resolved!, entities)).toEqual([]);
  });

  it('genuine working fallback: light unavailable, switch twin reachable → switch target counts as fallback, nothing offline', () => {
    const entities = [
      ...baseEntities(),
      entity('light.garage_accent', 'unavailable', 'Garage Accent LED (Govee)'),
      entity('switch.garage_accent', 'on', 'Garage Accent LED (Govee)'),
    ];

    const resolved = resolveWorkflow(RULE, entities);
    expect(resolved).not.toBeNull();

    // The unavailable light is swapped for the reachable switch twin.
    expect(resolved!.targetEntityIds).toEqual([
      'light.garage_north_cabinets',
      'light.garage_tool_cabinets',
      'switch.garage_accent',
    ]);
    // The switch is a genuine working fallback (reachable, with a dead light twin).
    expect(resolved!.fallbackEntityIds).toEqual(['switch.garage_accent']);
    // Fallback is reachable, so the UI shows it as fallback — NOT offline.
    expect(computeOfflineEntities(resolved!, entities)).toEqual([]);
  });

  it('dead light + dead switch twin: surfaces as offline, NOT a false-positive fallback', () => {
    const entities = [
      ...baseEntities(),
      entity('light.garage_accent', 'unavailable', 'Garage Accent LED (Govee)'),
      entity('switch.garage_accent', 'unavailable', 'Garage Accent LED (Govee)'),
    ];

    const resolved = resolveWorkflow(RULE, entities);
    expect(resolved).not.toBeNull();

    expect(resolved!.targetEntityIds).toEqual([
      'light.garage_north_cabinets',
      'light.garage_tool_cabinets',
      'switch.garage_accent',
    ]);
    // The chosen switch is itself dead, so it is NOT a working fallback.
    expect(resolved!.fallbackEntityIds).toEqual([]);
    // The degradation must surface as offline instead of masquerading as fallback.
    expect(computeOfflineEntities(resolved!, entities)).toEqual([
      'switch.garage_accent',
    ]);
  });

  it('light unavailable with no switch twin: keeps the dead light target and reports it offline', () => {
    const entities = [
      ...baseEntities(),
      entity('light.garage_accent', 'unavailable', 'Garage Accent LED (Govee)'),
    ];

    const resolved = resolveWorkflow(RULE, entities);
    expect(resolved).not.toBeNull();

    // No switch twin to route around, so the original light id is retained.
    expect(resolved!.targetEntityIds).toEqual([
      'light.garage_north_cabinets',
      'light.garage_tool_cabinets',
      'light.garage_accent',
    ]);
    expect(resolved!.fallbackEntityIds).toEqual([]);
    expect(computeOfflineEntities(resolved!, entities)).toEqual([
      'light.garage_accent',
    ]);
  });
});
