# Changelog

## 1.0.24

- **Home Assistant Areas & Rooms Integration**: Dynamic discovery and grouping of all entities by Home Assistant Area (`config/area_registry/list`, `config/device_registry/list`, `config/entity_registry/list`). Added `/api/ha/areas` endpoint and `HAAreasCard.tsx` on the Systems dashboard, allowing users to browse and control devices organized by physical rooms with zero manual configuration.
- **Zero Quoted Entity Literals**: Eliminated every single quoted hardcoded entity literal (`sensor.*`, `switch.*`, `light.*`, `climate.*`, `binary_sensor.*`) across `src/` and `server/`. All smart devices now resolve through dynamic discovery, area registry, and user-configurable entity mappings.
- **Dynamic Location & Zero Hardcoded Geolocation**: Purged all remaining hardcoded `America/Los_Angeles` timezone literals and Downtown LA coordinates (`34.0522, -118.2437`). All services now query `getEstateConfig()` and `getEstateTimezone()` or the client browser timezone, enabling full geographic portability for any estate worldwide.
- **Universal Utility Branding & LADWP Elimination**: Replaced all hardcoded utility branding and rate tables in UI cards (`EnergyInsightsCard.tsx`, `ElectricityCostCard.tsx`) with generic "Utility Rate Schedule", "Utility Tier", and "Billed" labels, fully matching user-configured utility rates.
- **Automated CI Smoke Testing & Fresh-Install Validation**: Enhanced `.github/workflows/ci.yml` to run full TypeScript typechecking (`typecheck`), production Vite/esbuild bundle validation (`build`), and automated database migration execution on fresh Postgres instances, preventing runtime regressions on new installs.
- **Multi-Arch Prebuilt Container Images**: Configured GitHub Container Registry (`ghcr.io/tonysafoian/janus-{arch}`) prebuilt images and publishing workflow (`.github/workflows/addon-builder.yml`) for `aarch64` and `amd64`, dramatically accelerating add-on installation and updates on Home Assistant Yellow, Green, Raspberry Pi, and x86 hardware.

## 1.0.23

- **Dynamic Circuit & Panel Discovery**: `EmporiaEnergyCard.tsx` now dynamically discovers all available power sensors from Home Assistant (`_power_minute_average`, `device_class: power`, unit `W`/`kW`) and builds dynamic panel groups, eliminating static circuit lists and supporting any home energy setup.
- **Zero Hardcoded Personal Devices & IDs**: Purged all remaining private device names and room identifiers (`TigerDen`, private Notion database UUIDs) from Notion integration routes, frontend prefetchers, skills documentation (`notion-tasks`, `home-automation`), and test scripts.
- **Generic Database Migration Seeds**: Sanitized initial time-tracking category seeds in migration `0051` to generic defaults (`Home Maintenance`, `Property Projects`, `Errands & Services`).
- **Dynamic Estate Timezone for Energy Statistics**: `haStatistics.ts` now dynamically resolves the local estate timezone from Home Assistant Core `/api/config` or environment rather than hardcoding `America/Los_Angeles`.
- **Add-on Configuration Masking**: Masked `database_url` as a `password?` field in `janus/config.yaml` to ensure database credentials are never rendered in plaintext in the Home Assistant UI.

## 1.0.22

- **Fix Printers Card Import**: Added missing `useMemo` import from React in `PrintersCard.tsx`, resolving runtime `ReferenceError` on the Systems dashboard.

## 1.0.21

- **Configurable Electricity Rates & Open-Source Utility Engine**: Added `electricity_rate_per_kwh` option in `janus/config.yaml` and dynamic resolution in `server/routes/electricity.ts`. Users outside Los Angeles or with flat-rate power tariffs can now set their rate directly in add-on options or Settings, bypassing hardcoded LADWP tiered rates.
- **Home Assistant Person Auto-Sync**: Janus now automatically queries Home Assistant Core's `person.*` entities and syncs real household members directly into `household_members`, automatically deactivating default placeholder records.
- **Dynamic Printer Auto-Discovery**: Replaced hardcoded office printer IDs in `PrintersCard.tsx` and `monitoring.ts` with dynamic IPP, Brother, HP, Canon, Epson, and Bambu 3D printer discovery with clean empty states when no printers exist.
- **Generic Hardware Fallbacks & Empty States**: Added graceful empty states and dynamic entity detection across Electrical Monitoring (`EmporiaEnergyCard.tsx`), Fireplaces (`CrestronFireplacesCard.tsx`), and WAN interfaces (`SpectrumCard.tsx`), making the dashboard 100% vendor-agnostic for open-source users.
- **Self-Healing Automations**: `ha-server-health`, `internet-health`, and `printer-health` automations now auto-seed if missing in database, eliminating "Automation not found in DB" warnings on fresh installs.

## 1.0.20

- **Real Home Assistant User Role Mapping (WebSocket `config/auth/list`)**: Janus no longer treats all Home Assistant users as administrators. Ingress sessions query the real Home Assistant user role over the Core WebSocket API, verifying `is_owner`, `is_admin`, and `group_ids` (`system-admin`) with fallback to member role for non-admins.
- **Dynamic Estate Timezone, Location & GPS Decoupling**: Completely decoupled timezone and GPS coordinates from code. Weather, entertainment, broadcast, and crons dynamically query `/api/estate/config` or use environment fallbacks, replacing hardcoded California coordinates and `America/Los_Angeles` timestamps.
- **Fail-Safe Cron Monitors & Zero 500 Sweeps**: Protected package arrival and morning weather crons from returning 500 when external Google credentials or keys are not configured or expired, returning graceful skipped statuses.
- **Add-on Schema & DOCS Alignment**: Synchronized `janus/config.yaml` schema with `janus/DOCS.md`, adding `anthropic_api_key`, `openai_api_key`, `verkada_api_key`, `verkada_org_id`, `fortigate_host`, `fortigate_api_key`, `ruckus_host`, `wati_phone_number`, and `alert_phone_number`.
- **Zero Personal Names In Code/Comments**: Scrubbed all remaining personal name references and internal room/device identifiers across skill files, tests, and schema comments.

## 1.0.19

- **Ingress Anti-Spoofing & HA RBAC**: Required authentic `SUPERVISOR_TOKEN` to accept `X-Remote-User-*` headers (preventing header spoofing in standalone environments); added `panel_admin: true` to `janus/config.yaml` to restrict sidebar access to Home Assistant administrators.
- **Backend Entity Mappings Integration**: Wired backend services (`pool.ts`, `monitoring.ts`) to dynamically query `system_configs.entity_mappings` for pool heater, spa pump, pool/spa temperature sensors, speedtest sensors, and custom climate entities.
- **Comprehensive Privacy Scrubbing**: Scrubbed all personal family and staff names across all database migrations, backend routes, UI components, and test fixtures.
- **Deduplicated Grocery Seeds**: Applied unique constraint on grocery staple names and idempotent `WHERE NOT EXISTS` seed inserts (`0025`, `0029`, `0031`, and migration `0060`).
- **Schema Options Synchronization**: Added `home_location`, `home_lat`, `home_lng`, `staff_emails`, `assistant_email`, `computer_admin_token`, `cron_secret`, and `enable_goaccess` to `janus/config.yaml` schema and documented them in `janus/DOCS.md`.

## 1.0.18

- **Database Seed Migrations Fix**: Fixed SQL syntax and column mismatch errors in fresh database seeds (`0025`, `0029`, `0031`, and `0049`) allowing clean out-of-the-box initialization.
- **Dynamic Seeding Parameters**: Fixed prepared statement parameter count mismatch in `server/seed.ts` household members verification.
- **Home Assistant Ingress RBAC**: Corrected admin detection for Home Assistant Ingress users (Supervisor does not forward `X-Remote-User-Is-Admin`; now securely defaults Ingress sessions to admin when running within the add-on environment).
- **Package Arrival Monitor Auth**: Fixed CRON authentication on `/api/package-arrival-monitor` by using standard middleware auth and checking `x-cron-secret`.
- **HA Camera Endpoint Mount**: Mounted Home Assistant routes at `/api/ha` in addition to `/api/home-assistant`, matching frontend camera proxy and stream endpoints.
- **Graceful Cron Monitors**: Handled missing pool temperature, spa pump, and speedtest entities gracefully without returning 500/503 errors on standard cron sweeps.
- **PII Scrubbing**: Replaced remaining test/comment PII (IPs, coordinates, and personal name references in automation descriptions and prompts) with role-based and configurable values.
- **Multi-line Option Export**: Hardened `janus/run.sh` to safely parse and export multi-line JSON secrets and service accounts without line truncation.

## 1.0.17

- **Dockerfile Git Fallback**: Added robust branch-fallback logic to Dockerfile for custom git ref checkouts in Home Assistant Add-on builds.

## 1.0.16

- **Privacy & Security Audit**: Removed personal data from database migrations, neutralized seed rosters, and converted all API credentials to masked password fields in add-on schema.

## 1.0.15

- **HA WebSocket Reconnection**: Enhanced WebSocket auto-reconnect and cache synchronization for Home Assistant Core entity state updates.

## 1.0.14

- **SSRF Hardening**: Strengthened SSRF filter boundaries to protect internal estate network endpoints while permitting Home Assistant supervisor proxying.

## 1.0.13

- **RBAC Refinement**: Added granular role-based permissions and approval statuses for household staff and family members.

## 1.0.12

- **Device & Entity Mappings Card**: Added interactive UI card in Settings for auto-discovering and mapping Home Assistant entities (power, irrigation, climate, cameras, vehicles, utility rates).

## 1.0.11

- **Energy & Utility Rates**: Added custom kWh electricity and water HCF rate tracking to estate configuration.

## 1.0.10

- **Setup Guide**: Added first-time setup and onboarding guide banner to Settings page.

## 1.0.9

- **Household Members Management**: Added household members management card in Settings with avatar, role, and permission controls.

## 1.0.8

- **Fix**: Load Home Assistant Supervisor `SUPERVISOR_TOKEN` from S6-overlay `/var/run/s6/container_environment/` and wrap startup with `with-contenv`. Auto-configure `HA_URL="http://supervisor/core"` and `HA_TOKEN` so Home Assistant WebSocket connects on boot and pulls all smart home entities.

## 1.0.7

- **Fix**: Add missing runtime dependencies `ajv` and `@octokit/request-error` to production `dependencies` in `package.json` so Node runtime resolves all required packages when installed via `npm ci --omit=dev`.

## 1.0.6

- **Fix**: Authorize Home Assistant supervisor internal Docker IP (`172.30.32.2`) in SSRF guard and use `/websocket` proxy endpoint for supervisor connections.
- **UI**: Standardize generic hardware terms ('House Lights', 'Climate & Thermostats', 'Fireplaces & Switches', 'Security & Alarm', 'Pool & Spa') and add graceful empty states.
- **Perf**: Move `vite-plugin-pwa` to `devDependencies` to eliminate heavy build dependencies in runtime container.

## 1.0.5

- **Fix**: Support Home Assistant Ingress subpath routing (`/api/hassio_ingress/<token>/`) across React Router, API fetch client, and WebSocket connections so the web UI loads seamlessly inside Home Assistant.

## 1.0.4

- **Fix**: Automatically generate and persist `JWT_SECRET` / `SESSION_SECRET` on `/data/jwt_secret` in Home Assistant add-on startup, with safe cryptographic fallback in `server/auth.ts` so the server never crashes on missing secrets.

## 1.0.3

- **Fix**: Make `pdf-parse` dynamic with fallback polyfills for DOMMatrix in `server/handlers/whatsapp.ts` so `pdfjs-dist` browser DOM dependencies are never loaded at server startup.

## 1.0.2

- **Fix**: Completely decouple Vite in production bundles by using dynamic module evaluation so `node dist/index.js` never evaluates Vite or Rolldown native bindings at startup.
- **Fix**: Guard `0042_reconcile_remaining_migration_drift.sql` so missing `janus_memory.embedding` is only checked if the `vector` type is installed, preventing migration abort on standard PostgreSQL installations.
- **Fix**: Enable Alpine community repository in `Dockerfile` to reliably install `postgresql-pgvector`.

## 1.0.1

- **Fix**: Decouple static file serving from Vite/Rolldown so runtime production starts cleanly on Alpine / aarch64 without native binding errors.
- **Fix**: Add defensive exception guards around pgvector extension in migrations `0010` and `0045` so Janus boots reliably on standard PostgreSQL without pgvector.
- **Fix**: Include `postgresql16-client` so `psql` and `createdb` utilities are available for embedded database operations.

## 1.0.0

- Initial release of Janus as an official Home Assistant Add-on.
- Native Ingress integration: embed Janus directly into Home Assistant's left sidebar.
- Zero-config Home Assistant API discovery via Supervisor token.
- Embedded PostgreSQL with automatic persistence on `/data/postgres`.
- 1-click Demo / Local Test authentication mode.
