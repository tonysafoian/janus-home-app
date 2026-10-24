# Changelog

All notable changes to this project will be documented in this file.

## [1.0.25] - 2026-10-24

- **October 2026 Ecosystem Security Hardening**: Audited and patched open source dependencies against critical October 2026 vulnerability disclosures.
- **PHP & C++ Ecosystem Assessment**: Verified Janus has zero exposure to the October 2026 "PHP2Shell" RCE flaws (CVE-2026-109618, CVE-2026-109619), containing 0% PHP runtime, 0% PHP-FPM/mod_php, and 0% native C/C++ compiled services.
- **Container OS & C/C++ Runtime Library Upgrades**: Added `apk upgrade --no-cache` to both root `Dockerfile` and `janus/Dockerfile` ensuring all underlying Alpine base libraries (`musl`, `libstdc++`, `openssl`, `curl`) immediately pull latest vendor security patches during container build.
- **npm Dependency Hardening**: Ran security vulnerability remediation (`npm audit fix`), resolving 24 package vulnerabilities across body-parser, undici, ws, tar, brace-expansion, xmldom, and vite without breaking changes.
- **Dockerfile Release Alignment**: Updated `io.hass.version` and `BUILD_VERSION` to `1.0.25`.

## [1.0.24] - 2026-10-17

- **Home Assistant Areas & Rooms Integration**: Dynamic discovery and grouping of all entities by Home Assistant Area (`config/area_registry/list`, `config/device_registry/list`, `config/entity_registry/list`). Added `/api/ha/areas` endpoint and `HAAreasCard.tsx` on the Systems dashboard, allowing users to browse and control devices organized by physical rooms with zero manual configuration.
- **Zero Quoted Entity Literals**: Eliminated every single quoted hardcoded entity literal (`sensor.*`, `switch.*`, `light.*`, `climate.*`, `binary_sensor.*`) across `src/` and `server/`. All smart devices now resolve through dynamic discovery, area registry, and user-configurable entity mappings.
- **Dynamic Location & Zero Hardcoded Geolocation**: Purged all remaining hardcoded `America/Los_Angeles` timezone literals and Downtown LA coordinates (`34.0522, -118.2437`). All services now query `getEstateConfig()` and `getEstateTimezone()` or the client browser timezone, enabling full geographic portability for any estate worldwide.
- **Universal Utility Branding & LADWP Elimination**: Replaced all hardcoded utility branding and rate tables in UI cards (`EnergyInsightsCard.tsx`, `ElectricityCostCard.tsx`) with generic "Utility Rate Schedule", "Utility Tier", and "Billed" labels, fully matching user-configured utility rates.
- **Automated CI Smoke Testing & Fresh-Install Validation**: Enhanced `.github/workflows/ci.yml` to run full TypeScript typechecking (`typecheck`), production Vite/esbuild bundle validation (`build`), and automated database migration execution on fresh Postgres instances, preventing runtime regressions on new installs.
- **Multi-Arch Prebuilt Container Images**: Configured GitHub Container Registry (`ghcr.io/tonysafoian/janus-{arch}`) prebuilt images and publishing workflow (`.github/workflows/addon-builder.yml`) for `aarch64` and `amd64`, dramatically accelerating add-on installation and updates on Home Assistant Yellow, Green, Raspberry Pi, and x86 hardware.

## [1.0.23] - 2026-10-16

- **Dynamic Circuit & Panel Discovery**: `EmporiaEnergyCard.tsx` now dynamically discovers all available power sensors from Home Assistant (`_power_minute_average`, `device_class: power`, unit `W`/`kW`) and builds dynamic panel groups, eliminating static circuit lists and supporting any home energy setup.
- **Zero Hardcoded Personal Devices & IDs**: Purged all remaining private device names and room identifiers from Notion integration routes, frontend prefetchers, skills documentation (`notion-tasks`, `home-automation`), and test scripts.
- **Generic Database Migration Seeds**: Sanitized initial time-tracking category seeds in migration `0051` to generic defaults (`Home Maintenance`, `Property Projects`, `Errands & Services`).
- **Dynamic Estate Timezone for Energy Statistics**: `haStatistics.ts` now dynamically resolves the local estate timezone from Home Assistant Core `/api/config` or environment rather than hardcoding `America/Los_Angeles`.
- **Add-on Configuration Masking**: Masked `database_url` as a `password?` field in `janus/config.yaml` to ensure database credentials are never rendered in plaintext in the Home Assistant UI.

## [1.0.22] - 2026-10-15

- **Fix Printers Card Import**: Added missing `useMemo` import from React in `PrintersCard.tsx`, resolving runtime `ReferenceError` on the Systems dashboard.

## [1.0.21] - 2026-10-15

- **Configurable Electricity Rates & Open-Source Utility Engine**: Added `electricity_rate_per_kwh` option in `janus/config.yaml` and dynamic resolution in `server/routes/electricity.ts`. Users outside Los Angeles or with flat-rate power tariffs can now set their rate directly in add-on options or Settings, bypassing hardcoded LADWP tiered rates.
- **Home Assistant Person Auto-Sync**: Janus now automatically queries Home Assistant Core's `person.*` entities and syncs real household members directly into `household_members`, automatically deactivating default placeholder records.
- **Dynamic Printer Auto-Discovery**: Replaced hardcoded office printer IDs in `PrintersCard.tsx` and `monitoring.ts` with dynamic IPP, Brother, HP, Canon, Epson, and Bambu 3D printer discovery with clean empty states when no printers exist.
- **Generic Hardware Fallbacks & Empty States**: Added graceful empty states and dynamic entity detection across Electrical Monitoring (`EmporiaEnergyCard.tsx`), Fireplaces (`CrestronFireplacesCard.tsx`), and WAN interfaces (`SpectrumCard.tsx`), making the dashboard 100% vendor-agnostic for open-source users.
- **Self-Healing Automations**: `ha-server-health`, `internet-health`, and `printer-health` automations now auto-seed if missing in database, eliminating "Automation not found in DB" warnings on fresh installs.

## [1.0.20] - 2026-10-14

- **Real Home Assistant User Role Mapping (WebSocket `config/auth/list`)**: Janus no longer treats all Home Assistant users as administrators. Ingress sessions query the real Home Assistant user role over the Core WebSocket API, verifying `is_owner`, `is_admin`, and `group_ids` (`system-admin`) with fallback to member role for non-admins.
- **Dynamic Estate Timezone, Location & GPS Decoupling**: Completely decoupled timezone and GPS coordinates from code. Weather, entertainment, broadcast, and crons dynamically query `/api/estate/config` or use environment fallbacks, replacing hardcoded California coordinates and `America/Los_Angeles` timestamps.
- **Fail-Safe Cron Monitors & Zero 500 Sweeps**: Protected package arrival and morning weather crons from returning 500 when external Google credentials or keys are not configured or expired, returning graceful skipped statuses.
- **Add-on Schema & DOCS Alignment**: Synchronized `janus/config.yaml` schema with `janus/DOCS.md`, adding all optional keys and credentials.
- **Zero Personal Names In Code/Comments**: Scrubbed all remaining personal name references and internal room/device identifiers across skill files, tests, and schema comments.

## [1.0.19] - 2026-10-12

- **Ingress Anti-Spoofing & HA RBAC**: Required authentic `SUPERVISOR_TOKEN` to accept `X-Remote-User-*` headers (preventing header spoofing in standalone environments); added `panel_admin: true` to `janus/config.yaml` to restrict sidebar access to Home Assistant administrators.
- **Backend Entity Mappings Integration**: Wired backend services (`pool.ts`, `monitoring.ts`) to dynamically query `system_configs.entity_mappings` for pool heater, spa pump, pool/spa temperature sensors, speedtest sensors, and custom climate entities.
- **Comprehensive Privacy Scrubbing**: Scrubbed all personal family and staff names across all database migrations, backend routes, UI components, and test fixtures.
- **Deduplicated Grocery Seeds**: Applied unique constraint on grocery staple names and idempotent `WHERE NOT EXISTS` seed inserts (`0025`, `0029`, `0031`, and migration `0060`).
- **Schema Options Synchronization**: Added `home_location`, `home_lat`, `home_lng`, `staff_emails`, `assistant_email`, `computer_admin_token`, `cron_secret`, and `enable_goaccess` to `janus/config.yaml` schema and documented them in `janus/DOCS.md`.
### Reliability & Fresh Installs
- **Database Seed Migrations Fix**: Fixed SQL syntax and column mismatch errors in fresh database seeds (`0025`, `0029`, `0031`, and `0049`) allowing clean out-of-the-box initialization.
- **Dynamic Seeding Parameters**: Fixed prepared statement parameter count mismatch in `server/seed.ts` household members verification.
- **Home Assistant Ingress RBAC**: Corrected admin detection for Home Assistant Ingress users (Supervisor does not forward `X-Remote-User-Is-Admin`; now securely defaults Ingress sessions to admin when running within the add-on environment).
- **Package Arrival Monitor Auth**: Fixed CRON authentication on `/api/package-arrival-monitor` by using standard middleware auth and checking `x-cron-secret`.
- **HA Camera Endpoint Mount**: Mounted Home Assistant routes at `/api/ha` in addition to `/api/home-assistant`, matching frontend camera proxy and stream endpoints.
- **Graceful Cron Monitors**: Handled missing pool temperature, spa pump, and speedtest entities gracefully without returning 500/503 errors on standard cron sweeps.
- **PII Scrubbing**: Replaced remaining test/comment PII (IPs, coordinates, and personal name references in automation descriptions and prompts) with role-based and configurable values.
- **Multi-line Option Export**: Hardened `janus/run.sh` to safely parse and export multi-line JSON secrets and service accounts without line truncation.

## [1.0.17] - 2026-10-11
### Fixes
- **Home Assistant Add-on Local Build**: Removed external `image:` reference to `ghcr.io` from `janus/config.yaml`. Home Assistant now builds the add-on container directly on device from source using `janus/Dockerfile`, completely resolving `[403] Head "https://ghcr.io/...": denied` errors during installation and updates.
- **Dockerfile Build Fallback**: Added robust branch/tag fallback in `janus/Dockerfile` so container builds clone the tagged release or fall back to default branch cleanly.

## [1.0.16] - 2026-10-11
### Security & Privacy
- **Scrubbed Personal PII**: Removed hardcoded residential GPS coordinates, utility account numbers, personal bills, personal phone numbers, and basketball roster emails from migrations and codebase.
- **Private Seed Separation**: Moved private household roster and sample bills into `scripts/seed-private-data.example.sql`.
- **Default Demo Mode Disabled**: Turned off demo login by default in `.env.example` and add-on configuration.
- **Home Assistant Ingress RBAC**: Implemented role mapping via `X-Remote-User-Is-Admin`, `X-Remote-User-Id`, and `X-Remote-User-Name`. Home Assistant Admins receive full admin privileges, while standard users receive non-admin member roles.
- **Masked Add-on Credentials**: Upgraded all API keys and secrets in add-on `config.yaml` to `password` type fields.

### Reliability & Fresh Installs
- **Automatic CRON_SECRET Generation**: Janus now auto-generates and persists a secure `CRON_SECRET` in `/data` on first start if not configured, eliminating 401 cron job failures.
- **Database Migration 0059**: Added missing `failed_jobs.last_attempted_at` column.
- **Graceful Optional Integrations**: Health check and cron scheduler now treat unconfigured services (WATI, Google Service Account, FortiGate, Verkada, Notion, ElevenLabs) as `not_configured` rather than errors, allowing new installs to report an `ok` health status out-of-the-box.
- **Reproducible Dockerfile**: Switched add-on Dockerfile to build directly from tagged source files instead of cloning `main` dynamically at container build time.

### Generic Device & Integration Support
- **Universal Home Assistant Cameras**: Added `/api/ha/camera_proxy/:entityId` and stream endpoints supporting any Home Assistant camera (UniFi Protect, Reolink, Nest, Ring, Amcrest, etc.).
- **Automatic Tesla Discovery**: Automatically reads vehicle telemetry (battery, range, charging state, location, climate) from existing Home Assistant Tesla integrations without requiring a Tesla Developer Account.
- **Configurable Entity Mappings**: Added graphical Device & Entity Mappings card to Settings for customizing energy sensors, climate thermostats, pool heaters, and utility rates ($/kWh and $/HCF).
- **Dynamic Estate Configuration**: Reads timezone, coordinates, and units dynamically from Home Assistant `/api/config`.

## [1.0.0] - 2026-09-28
### Added
- Initial open-source release of the Janus smart home platform.
- Comprehensive Smart Home integrations:
  - Home Assistant (lighting, climate, security locks, entity logs)
  - Tesla Fleet API (vehicle telemetry, battery monitoring, charging schedules)
  - Network infrastructure monitoring (firewall interface health, wireless APs)
  - Energy monitoring & circuit tracking
  - Pool & Spa controls
- AI-Powered Assistant (Janus):
  - Multimodal chat (vision, documents, audio)
  - Long-term semantic memory backed by `pgvector`
  - WhatsApp webhook integration for family & staff messaging
  - Inbound email polling and automated triage
  - Extensible tool execution system
- Family & Household Operations:
  - Daily morning briefing emails with weather & alerts
  - Automated household routines and light/timer management
  - Contractor time-tracking and expense approvals
  - Weekly sports & pickup basketball RSVP platform with legal e-waiver tracking
