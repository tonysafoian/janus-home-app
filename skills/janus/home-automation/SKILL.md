---
name: Home Automation
description: Control and query home devices via Home Assistant — pool/spa, lights, pumps, heaters, printers, media players and speakers. Load BEFORE any ha_* tool call so you use the exact entity_id.
channels: [chat, whatsapp, email]
roles: [admin, member]
---

# Home Automation (Home Assistant)

Janus controls the house through Home Assistant. Use the device directory below
FIRST — never call `ha_get_states` just to look up an entity you already know.
Match the user's words to a device by app name, then call `ha_call_service`
directly with the `entity_id`. Only fall back to `ha_get_states` for a device
that is genuinely not listed here.

## Tools

- `ha_call_service(domain, service, entity_id, data?)` — perform an action.
  Examples: `light.turn_on`, `light.turn_off`, `switch.turn_on`,
  `switch.turn_off`, `climate.set_temperature`, `media_player.play_media`.
- `ha_get_state(entity_id)` — read one entity's current state/attributes.
- `ha_get_states()` — list all entities (only when a device isn't in this directory).
- `ha_get_logbook(entity_id?, hours?)` — recent history for a device.

Common patterns:
- Turn a light on: `ha_call_service("light", "turn_on", "light.pool_light")`.
- Set a light effect: `ha_call_service("light", "turn_on", "light.pool_light", { effect: "Caribbean Blue" })`.
- Set pool temperature: `ha_call_service("climate", "set_temperature", "climate.pool", { temperature: 90 })`.
- Toggle a switch (pump/heater): `switch.turn_on` / `switch.turn_off`.

Confirm before destructive or high-cost actions (turning on heaters/pumps that
cost money to run, or anything affecting the whole house). Read state to verify
the result when the user asked for a specific outcome.

## Device Discovery & Control

Janus connects to your smart home via Home Assistant. Rather than assuming static
device names, discover and interact with entities dynamically:

1. **Entity Mappings:** Check configured device mappings via `getEntityMappings()` or Settings → Device & Entity Mappings for authoritative entity IDs (e.g. pool heater, spa pump, climate zones).
2. **Dynamic Search:** Use `ha_get_states()` or filter by domain (`light.*`, `switch.*`, `climate.*`, `media_player.*`, `sensor.*`) matching the room or device friendly name requested by the user.
3. **Common Domains & Services:**
   - **Lights:** `ha_call_service("light", "turn_on", entity_id, { brightness_pct, rgb_color, effect })` / `turn_off`.
   - **Switches & Relays:** `ha_call_service("switch", "turn_on", entity_id)` / `turn_off`.
   - **Climate & Thermostats:** `ha_call_service("climate", "set_temperature", entity_id, { temperature, hvac_mode })`.
   - **Media Players & Speakers:** `ha_call_service("media_player", "play_media", entity_id, { media_content_type, media_content_id })`, `media_pause`, `volume_set`.
   - **Printers (IPP / SNMP):** Check toner sensors (`sensor.*_toner`, `sensor.*_cartridge`) and printer status (`sensor.*_status`).
   - **Pool & Spa:** Check temperature sensors (`sensor.*_pool_temp`, `sensor.*_spa_temp`) and toggle pumps/heaters via their mapped switch entities.

Confirm with the user before destructive or high-cost actions (turning on pool/spa heaters that consume significant energy or changes affecting whole-house systems). Always verify the resulting state after triggering an action.
