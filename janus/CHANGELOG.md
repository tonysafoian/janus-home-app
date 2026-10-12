# Changelog

## 1.0.18

- **Database Seed Migrations Fix**: Fixed SQL syntax and column mismatch errors in fresh database seeds (`0025`, `0029`, `0031`, and `0049`) allowing clean out-of-the-box initialization.
- **Dynamic Seeding Parameters**: Fixed prepared statement parameter count mismatch in `server/seed.ts` household members verification.
- **Home Assistant Ingress RBAC**: Corrected admin detection for Home Assistant Ingress users (Supervisor does not forward `X-Remote-User-Is-Admin`; now securely defaults Ingress sessions to admin when running within the add-on environment).
- **Package Arrival Monitor Auth**: Fixed CRON authentication on `/api/package-arrival-monitor` by using standard middleware auth and checking `x-cron-secret`.
- **HA Camera Endpoint Mount**: Mounted Home Assistant routes at `/api/ha` in addition to `/api/home-assistant`, matching frontend camera proxy and stream endpoints.
- **Graceful Cron Monitors**: Handled missing pool temperature, spa pump, and speedtest entities gracefully without returning 500/503 errors on standard cron sweeps.
- **PII Scrubbing**: Replaced remaining test/comment PII (IPs, coordinates, and personal name references in automation descriptions and prompts) with role-based and configurable values.
- **Multi-line Option Export**: Hardened `janus/run.sh` to safely parse and export multi-line JSON secrets and service accounts without line truncation.

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
