# Changelog

All notable changes to this project will be documented in this file.

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
