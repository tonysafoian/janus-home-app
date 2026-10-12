# 🏛️ Janus Home Automation — Home Assistant Add-on Documentation

Janus is an open-source, AI-orchestrated residential estate operating system and executive command deck designed to integrate deeply with Home Assistant.

---

## 🚀 First-Run Checklist (Zero Configuration Required)

Janus works immediately out of the box with zero external dependencies:

1. **Install the Add-on**:
   - Navigate to **Settings ➔ Add-ons ➔ Add-on Store ➔ ⋮ (top right) ➔ Repositories**.
   - Add: `https://github.com/tonysafoian/janus-home-app`
   - Select **Janus** and click **Install**.
2. **Start the Add-on**:
   - Toggle **Show in sidebar**.
   - Click **Start** (Janus will automatically provision an embedded PostgreSQL engine on `/data/postgres`, run all migrations, and generate a secure `CRON_SECRET`).
3. **Open the Web UI**:
   - Click **Open Web UI** or select Janus from the Home Assistant sidebar.
   - **Ingress Single Sign-On**: Janus reads your Home Assistant session (`X-Remote-User-*`). If you are a Home Assistant Administrator, you automatically receive Janus Admin privileges. Regular Home Assistant users receive member access.
4. **Pass Health Check**:
   - Navigate to **Automations ➔ Janus Health**. All baseline services report `ok`. Optional unconfigured integrations report `not_configured` without errors.

---

## ⚙️ Configuration Options

All options in the add-on configuration are optional. API keys are masked as password fields to prevent credential exposure.

### Core Settings

| Option | Type | Default | Description |
|---|---|---|---|
| `enable_demo_login` | boolean | `false` | Enables 1-click demo login on the authentication screen. Keep `false` for production home installs. |
| `enable_mock_mode` | boolean | `false` | Generates simulated telemetry for offline development. |
| `database_url` | password | `""` | Optional external PostgreSQL connection string. If left blank, Janus uses its isolated built-in PostgreSQL database. |
| `cron_secret` | password | `""` | Secret key for scheduled background task triggers. Auto-generated on first boot if omitted. |
| `computer_admin_token` | password | `""` | Optional high-entropy token for machine agents (`X-Computer-Token`). |
| `home_location` | string | `""` | Estate or home label (e.g. "Main Residence"). Falls back to Home Assistant location name. |
| `home_lat`, `home_lng` | float | `""` | Estate GPS coordinates for weather and vehicle distance tracking. Falls back to Home Assistant Core coordinates. |
| `staff_emails` | string | `""` | Comma-separated list of household staff email addresses for operational notifications. |
| `assistant_email` | string | `""` | Estate manager / executive assistant email address. |
| `enable_goaccess` | boolean | `false` | Enables real-time GoAccess web log analytics polling if installed on host. |

### AI & LLM Providers

| Option | Type | Required For |
|---|---|---|
| `openrouter_api_key` | password | Primary LLM chat, intent classification, and tool execution. Supports models like Gemini 2.5 Flash, Claude 3.5 Sonnet, and GPT-4o. |
| `gemini_api_key` | password | Google Gemini direct API access and real-time audio chat. |
| `anthropic_api_key` | password | Direct Anthropic Claude access. |
| `openai_api_key` | password | Direct OpenAI access. |
| `perplexity_api_key` | password | Live web synthesis research and smart troubleshooting queries (`perplexity_search`). |
| `elevenlabs_api_key` | password | Voice generation for spoken announcements and TTS briefings. |

### Optional Integrations

| Option | Description |
|---|---|
| `google_service_account_key` | JSON service account key string for Google Calendar, Gmail parcel scans, and Drive backups. |
| `wati_api_endpoint`, `wati_access_token`, `wati_phone_number` | WATI WhatsApp Business API for bi-directional household messaging and alert dispatch. |
| `alert_phone_number` | Destination mobile phone number (E.164) for urgent vehicle, security, or system alerts. |
| `tesla_client_id`, `tesla_client_secret` | (Optional) Direct Tesla Fleet API developer credentials. If omitted, Janus automatically discovers Tesla vehicles and telemetry from your Home Assistant Tesla integration (Tesla Fleet, Teslemetry, or Tessie). |
| `verkada_api_key`, `verkada_org_id` | (Optional) Verkada Cloud API for enterprise cameras and access doors. If omitted, Janus automatically discovers and displays all Home Assistant `camera.*` entities. |
| `fortigate_host`, `fortigate_api_key` | (Optional) FortiGate firewall REST API integration for real-time gateway and WAN bandwidth monitoring. |
| `ruckus_host`, `ruckus_username`, `ruckus_password` | (Optional) Ruckus Virtual SmartZone / Unleashed AP telemetry. |
| `notion_api_key` | (Optional) Notion integration for task lists, grocery staples, and household wiki sync. |

---

## 📷 Cameras & Security

Janus automatically discovers and displays any camera configured in Home Assistant:
- **Compatible Brands**: UniFi Protect, Reolink, Nest, Ring, Amcrest, Tapo, Hikvision, and any generic RTSP/MJPEG camera.
- **Snapshots**: Automatically proxied through `/api/ha/camera_proxy/{entity_id}` directly from Home Assistant.
- **Live Streams**: Streamed via Home Assistant camera stream proxy or rapid live refresh.
- **Enterprise Verkada**: If `verkada_api_key` and `verkada_org_id` are provided, Verkada devices blend seamlessly alongside Home Assistant cameras.

---

## 🚗 Vehicles & Fleet

- **Automatic Home Assistant Discovery**: Any vehicle integrated into Home Assistant via **Tesla Fleet**, **Teslemetry**, or **Tessie** is automatically discovered without requiring a Tesla Developer Account.
- **Metrics Tracked**: Battery level, estimated range, charging state, climate status, lock state, odometer, and vehicle location on the live interactive map.
- **Home Proximity**: Calculates real-time distance from the vehicle to your home coordinates configured in Home Assistant (`/api/config`).

---

## ⚡ Energy & Irrigation Customization

- **Settings ➔ Device & Entity Mappings**:
  - Auto-discovers power and energy sensors from Home Assistant.
  - Set custom electricity rates ($/kWh) and water rates ($/HCF).
  - Bind custom pool, climate, and irrigation entities.
- **Radiant Floor & HVAC**: Automatically maps climate thermostats and schedules from standard Home Assistant climate integrations.
