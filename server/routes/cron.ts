import cron from 'node-cron';
import { logAudit } from '../lib/auditLog';
import { generateCorrelationId } from '../lib/correlation';
import { runVerkadaWebhookHealthCheck } from '../scheduledTasks';
import { pingTunnel as pingRuckusTunnel } from '../lib/ruckus';
import { pingTunnel as pingFortigateTunnel } from '../lib/fortigate';
import { getEstateTimezone } from '../lib/estateConfig';

// NOTE (2026-05-17): checkAndRemovePgCronJobs() and the 15-min runDatabaseSync
// cron used to manage a separate Supabase-hosted PROD_DATABASE_URL. That
// project was deleted during the Express migration; PROD_DATABASE_URL has
// been unset since. Both code paths were silent no-ops and have been removed.
// See server/lib/auditLog.ts header for full history.

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

async function triggerRoute(path: string, body: Record<string, unknown> = {}): Promise<void> {
  const t0 = Date.now();
  // Generate one correlation id per cron tick and pass it as
  // X-Correlation-Id on the POST. The route's correlationMiddleware
  // sees the header and reuses it for the whole downstream run, so
  // the cron-trigger audit row and every audit / failed-jobs / chat-log
  // row written during the route's work share the same id. "Why did
  // Janus broadcast the weather twice on Tuesday?" becomes a single
  // SELECT … WHERE correlation_id = $1.
  const correlationId = `cron:${generateCorrelationId()}`;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': process.env.CRON_SECRET || '',
        'x-correlation-id': correlationId,
      },
      body: JSON.stringify(body),
    });
    const durationMs = Date.now() - t0;
    const status = res.ok ? 'ok' : `error ${res.status}`;
    console.log(`[cron] ${path} → ${status} (cid=${correlationId})`);
    logAudit('cron-trigger', {
      category: 'automation', event_type: 'cron_route_triggered', severity: 'info',
      actor_id: 'system', channel: 'cron',
      summary: `Cron triggered ${path}${res.ok ? '' : ` (HTTP ${res.status})`}`,
      detail: { path, http_status: res.status, body: Object.keys(body).length > 0 ? body : undefined },
      status: res.ok ? 'success' : 'error',
      duration_ms: durationMs,
      correlation_id: correlationId,
    }).catch((auditErr) => console.warn(`[audit] write failed: ${auditErr instanceof Error ? auditErr.message : auditErr}`));
  } catch (err) {
    const durationMs = Date.now() - t0;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cron] ${path} failed (cid=${correlationId}):`, message);
    logAudit('cron-trigger', {
      category: 'automation', event_type: 'cron_route_failed', severity: 'error',
      actor_id: 'system', channel: 'cron',
      summary: `Cron trigger failed for ${path}: ${message}`,
      detail: { path, error: message },
      status: 'error',
      duration_ms: durationMs,
      correlation_id: correlationId,
    }).catch((auditErr) => console.warn(`[audit] write failed: ${auditErr instanceof Error ? auditErr.message : auditErr}`));
  }
}

let cronInitialized = false;

export function initCronJobs(): void {
  if (cronInitialized) {
    console.warn('[cron] initCronJobs() called more than once — skipping to prevent duplicate cron jobs.');
    return;
  }
  cronInitialized = true;

  const isProduction = process.env.NODE_ENV === 'production';
  const forceEnable = process.env.ENABLE_CRON === '1';
  if (!isProduction && !forceEnable) {
    console.log('[cron] Skipping cron initialization (dev environment). Set ENABLE_CRON=1 to override.');
    return;
  }
  console.log(`[cron] Initializing scheduled jobs... (${isProduction ? 'production' : 'dev+ENABLE_CRON'})`);
  const tz = getEstateTimezone();

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    cron.schedule('*/30 * * * * *', () => {
      triggerRoute('/api/janus/email-poll');
    });

    cron.schedule('0 14 * * *', () => {
      console.log('[cron] Running daily entertainment sync (6:00 AM PST)');
      triggerRoute('/api/entertainment-sync', { action: 'all' });
    }, { timezone: 'UTC' });

    cron.schedule('15 14 * * *', () => {
      console.log('[cron] Running daily media sync (6:15 AM PST)');
      triggerRoute('/api/media-sync', { action: 'all' });
    }, { timezone: 'UTC' });
  }

  cron.schedule('*/30 * * * * *', () => {
    triggerRoute('/api/janus/reminder-dispatch');
  });

  cron.schedule('*/15 * * * *', () => {
    triggerRoute('/api/janus/health-check');
  });

  cron.schedule('*/15 * * * *', () => {
    triggerRoute('/api/internet-health-monitor');
  }, { timezone: 'UTC' });

  if (process.env.FORTIGATE_BASE_URL) {
    cron.schedule('*/15 * * * *', () => {
      triggerRoute('/api/fortigate-health-snapshot');
    }, { timezone: 'UTC' });

    cron.schedule('* * * * *', () => {
      triggerRoute('/api/fortigate-wan-snapshot');
    }, { timezone: 'UTC' });

    cron.schedule('*/2 * * * *', () => {
      pingFortigateTunnel();
    });
  }

  if (process.env.RUCKUS_BASE_URL) {
    cron.schedule('*/5 * * * *', () => {
      triggerRoute('/api/wireless-snapshot');
    }, { timezone: 'UTC' });

    cron.schedule('*/2 * * * *', () => {
      pingRuckusTunnel();
    });

    cron.schedule('*/15 * * * *', () => {
      triggerRoute('/api/wireless-snapshot-watchdog');
    });
  }

  // Seed network_devices from HA device_tracker.* entities (MAC + hostname)
  // so the WiFi Clients inventory is populated even before Ruckus/FortiGate
  // REST device data flows. Idempotent; every 30 min.
  cron.schedule('*/30 * * * *', () => {
    triggerRoute('/api/network-device-backfill');
  }, { timezone: 'UTC' });

  // Flag newly-appeared unknown devices (catch-weird-activity). Every 15 min.
  cron.schedule('*/15 * * * *', () => {
    triggerRoute('/api/network-new-device-monitor');
  }, { timezone: 'UTC' });

  cron.schedule('*/30 * * * *', () => {
    triggerRoute('/api/printer-health-monitor');
  }, { timezone: 'UTC' });

  cron.schedule('0 3 * * *', () => {
    console.log('[cron] Running log retention worker (daily 3:00 AM UTC)');
    triggerRoute('/api/log-retention-worker');
  }, { timezone: 'UTC' });

  cron.schedule('*/5 * * * *', () => {
    triggerRoute('/api/failed-job-retry-worker');
  }, { timezone: 'UTC' });

  cron.schedule('*/5 * * * *', () => {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return;
    triggerRoute('/api/package-arrival-monitor');
  }, { timezone: 'UTC' });

  cron.schedule('*/5 * * * *', () => {
    triggerRoute('/api/ha-server-health-monitor');
  }, { timezone: 'UTC' });

  cron.schedule('0 */6 * * *', () => {
    triggerRoute('/api/ha-update-checker');
  }, { timezone: 'UTC' });

  // Door locks & battery monitor — checks lock states, battery telemetry, and
  // connection status every 4 hours.
  cron.schedule('0 */4 * * *', () => {
    triggerRoute('/api/ha-locks-monitor');
  }, { timezone: tz });

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    // Google Assistant SDK health check — probes the service every 15 min
    cron.schedule('*/15 * * * *', () => {
      triggerRoute('/api/google-assistant-sdk-monitor');
    }, { timezone: 'UTC' });
  }

  // Thermostat monitor — polls all climate entities, logs to thermostat_logs,
  // alerts if temp out of range.
  cron.schedule('*/15 * * * *', () => {
    triggerRoute('/api/thermostat-monitor');
  }, { timezone: tz });

  // Energy Savings: fountains off nightly.
  cron.schedule('0 21 * * *', () => {
    triggerRoute('/api/energy/fountains-off');
  }, { timezone: tz });

  // Energy Savings: light timers — checks every 5 minutes using HA last_changed.
  cron.schedule('*/5 * * * *', () => {
    triggerRoute('/api/energy/light-timers');
  }, { timezone: 'UTC' });

  // AV Closet temp monitor — reads temperature sensor if configured
  if (process.env.GOVEE_API_KEY || process.env.ENABLE_AV_CLOSET_MONITOR === 'true') {
    cron.schedule('*/10 * * * *', () => {
      triggerRoute('/api/av-closet-temp-monitor');
    }, { timezone: tz });
  }

  // Thermostat freshness monitor — alerts if no rows have been
  // written to thermostat_logs in the last 30 minutes during operating hours.
  cron.schedule('*/15 * * * *', () => {
    triggerRoute('/api/thermostat-freshness-monitor');
  }, { timezone: tz });

  // Pool temp freshness monitor — alerts if no successful pool_temp_check
  // audit entries have been written within the threshold window during pool hours.
  cron.schedule('*/15 * * * *', () => {
    triggerRoute('/api/pool-temp-freshness-monitor');
  }, { timezone: tz });

  // Speed test pull from Home Assistant
  cron.schedule('*/15 * * * *', () => {
    triggerRoute('/api/speedtest-pull-from-ha');
  }, { timezone: 'UTC' });

  // Speed test freshness monitor
  cron.schedule('*/15 * * * *', () => {
    triggerRoute('/api/speed-test-freshness-monitor');
  }, { timezone: 'UTC' });

  cron.schedule('30 8 * * 1,3,5', () => {
    console.log('[cron] Running Morning Sauna automation (8:30 AM Mon/Wed/Fri)');
    triggerRoute('/api/automation/morning-sauna');
  }, { timezone: tz });

  cron.schedule('50 8 * * 2,4', () => {
    console.log('[cron] Running Morning Sauna automation (8:50 AM Tue/Thu)');
    triggerRoute('/api/automation/morning-sauna');
  }, { timezone: tz });

  cron.schedule('0 9 * * 1,3,5', () => {
    console.log('[cron] Stopping Morning Sauna after 30 minutes (9:00 AM PT Mon/Wed/Fri)');
    triggerRoute('/api/automation/morning-sauna/stop');
  }, { timezone: 'America/Los_Angeles' });

  cron.schedule('20 9 * * 2,4', () => {
    console.log('[cron] Stopping Morning Sauna after 30 minutes (9:20 AM PT Tue/Thu)');
    triggerRoute('/api/automation/morning-sauna/stop');
  }, { timezone: 'America/Los_Angeles' });

  cron.schedule('*/30 * * * *', () => {
    triggerRoute('/api/pool/temp-monitor');
  }, { timezone: tz });

  cron.schedule('*/30 * * * *', () => {
    triggerRoute('/api/pool/spa-mode-monitor');
  }, { timezone: tz });

  // ── Grocery weekly cycle ────────────────────────────────────────────────
  // Sat 00:00 — open the Sat→Fri cart cycle (idempotent)
  cron.schedule('0 0 * * 6', () => {
    console.log('[cron] Grocery: opening weekly cycle');
    triggerRoute('/cron/open-cycle');
  }, { timezone: tz });

  // Tue 16:00 — open-reminder notification (cart is open for next week)
  cron.schedule('0 16 * * 2', () => {
    console.log('[cron] Grocery: sending open-reminder notification');
    triggerRoute('/cron/open-reminder');
  }, { timezone: tz });

  // Thu 16:00 — last-call notification (cart closes tomorrow)
  cron.schedule('0 16 * * 4', () => {
    console.log('[cron] Grocery: sending last-call notification');
    triggerRoute('/cron/last-call');
  }, { timezone: tz });

  // Fri 16:00 — lock cart and submit to Amazon Grocery
  cron.schedule('0 16 * * 5', () => {
    console.log('[cron] Grocery: locking and submitting weekly order');
    triggerRoute('/cron/lock-and-submit');
  }, { timezone: tz });

  // Mon 06:00 — delivery-day notification
  cron.schedule('0 6 * * 1', () => {
    console.log('[cron] Grocery: Monday delivery follow-up');
    triggerRoute('/cron/rina-monday');
  }, { timezone: tz });

  cron.schedule('0 7 * * *', () => {
    if (!process.env.OPENROUTER_API_KEY) return;
    console.log('[cron] Running Morning Weather Email (7:00 AM daily)');
    triggerRoute('/api/reports/morning-weather');
  }, { timezone: tz });

  cron.schedule('0 16 * * *', () => {
    console.log('[cron] Running Daily EOD Summary (4:00 PM daily)');
    triggerRoute('/api/reports/eod-summary');
  }, { timezone: tz });

  cron.schedule('0 16 * * 5', () => {
    console.log('[cron] Running Weekly Planning Email (Fridays 4:00 PM)');
    triggerRoute('/api/reports/weekly-planning');
  }, { timezone: tz });

  cron.schedule('0 8 * * *', () => {
    console.log('[cron] Running Executive Status Email (8:00 AM daily)');
    triggerRoute('/api/reports/executive-status');
  }, { timezone: tz });

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    cron.schedule('*/30 * * * *', () => {
      triggerRoute('/api/calendar/conflicts');
    }, { timezone: tz });
  }

  cron.schedule('50 6 * * 1-5', () => {
    console.log('[cron] Running School Morning Broadcast (6:50 AM weekdays)');
    triggerRoute('/api/broadcast/school-morning');
  }, { timezone: tz });

  cron.schedule('30 7 * * 1-5', () => {
    console.log('[cron] Running School Morning Broadcast (7:30 AM weekdays)');
    triggerRoute('/api/broadcast/school-morning');
  }, { timezone: tz });

  cron.schedule('0 */2 * * *', () => {
    triggerRoute('/api/followup/accountability');
  }, { timezone: tz });

  if (process.env.TESLA_CLIENT_ID || process.env.ENABLE_TESLA === 'true') {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      cron.schedule('*/5 * * * *', () => {
        triggerRoute('/api/calendar/nav-tesla');
      }, { timezone: tz });
    }

    cron.schedule('*/30 * * * *', () => {
      triggerRoute('/api/tesla/battery-monitor');
    }, { timezone: 'UTC' });
  }

  cron.schedule('*/30 * * * *', () => {
    triggerRoute('/api/pool/rain-guard');
  }, { timezone: tz });

  if (process.env.VERKADA_API_KEY) {
    cron.schedule('*/15 * * * *', () => {
      runVerkadaWebhookHealthCheck().catch(err => console.error('[cron] Verkada webhook health check failed:', err));
    }, { timezone: 'UTC' });

    // Verkada POI backfill
    cron.schedule('0 */4 * * *', () => {
      triggerRoute('/api/verkada/poi-backfill');
    }, { timezone: 'UTC' });
  }

  if (process.env.ENABLE_GOACCESS === 'true') {
    cron.schedule('*/5 * * * *', () => {
      triggerRoute('/api/goaccess/poll');
    }, { timezone: tz });
  }

  if (process.env.NOTION_API_KEY) {
    cron.schedule('*/10 * * * *', () => {
      triggerRoute('/api/notion/poll');
    }, { timezone: 'UTC' });

    cron.schedule('*/15 * * * *', () => {
      triggerRoute('/api/notion-webhook-health-monitor');
    }, { timezone: 'UTC' });
  }

  // Electricity cost intelligence — hourly snapshot of energy stats from HA
  // for trend analysis without hammering HA on every API request.
  cron.schedule('5 * * * *', () => {
    console.log('[cron] Running hourly electricity snapshot sync');
    triggerRoute('/api/electricity/live-cost');
  }, { timezone: tz });

  // Per-circuit daily energy snapshot. Records the PRIOR
  // day's kWh into circuit_energy_daily
  // so Janus owns the full history (monthly reports work forever, even past
  // HA's recorder purge window). Idempotent: re-runs upsert the same day.
  cron.schedule('10 5 * * *', () => {
    console.log('[cron] Running daily per-circuit energy snapshot (prior day)');
    triggerRoute('/api/electricity/snapshot-daily');
  }, { timezone: tz });

  // Daily water usage snapshot. Records the PRIOR day's
  // interior gallons (FloLogic adapter) + per-zone irrigation gallons (Rain Bird
  // runtime × GPM from HA history) into water_usage_daily.
  // Idempotent: re-runs upsert the same day.
  cron.schedule('15 5 * * *', () => {
    console.log('[cron] Running daily water usage snapshot (prior day)');
    triggerRoute('/api/water/snapshot-daily');
  }, { timezone: tz });

  // Proactive token-expiration warnings — daily 9:00 AM. Scans
  // tesla_tokens + google_tokens for rows expiring within 24h and
  // alerts the admin before the 401 storm.
  cron.schedule('0 9 * * *', () => {
    console.log('[cron] Running token-expiration warnings sweep (9:00 AM)');
    triggerRoute('/api/janus/token-expiration-warnings');
  }, { timezone: tz });

  // HA Workflow Trigger Reconciler — checks every 30 min that Janus-managed
  // HA automations still exist and re-deploys any that went missing (e.g. after
  // an HA restart). Logs each redeploy to the audit log so it's visible in
  // the Automations page. Also fires a smart alert if the same rule keeps
  // needing repeated redeploys within an hour.
  cron.schedule('*/30 * * * *', () => {
    triggerRoute('/api/ha-workflow-reconciler');
  }, { timezone: 'UTC' });

  // Dependency security audit — daily 6:30 AM. Runs `npm audit --json
  // --omit=dev`, logs a vulnerability-count snapshot to the audit log, and
  // alerts the admin when NEW high/critical advisories appear.
  cron.schedule('30 6 * * *', () => {
    console.log('[cron] Running dependency security audit (6:30 AM daily)');
    triggerRoute('/api/security-audit-monitor');
  }, { timezone: tz });

  // What's New auto-generator — daily 5:30 PM.
  cron.schedule('30 17 * * *', () => {
    console.log("[cron] Running What's New auto-generator (5:30 PM daily)");
    triggerRoute('/api/updates-autogen');
  }, { timezone: tz });

  // ── Janus Time Tracking crons ───────────────────────────────────────────

  // Worker daily digest — 6 PM Mon–Sat.
  cron.schedule('0 18 * * 1-6', () => {
    console.log('[cron] Running time worker daily digest (6 PM)');
    triggerRoute('/api/time/cron/worker-digest');
  }, { timezone: tz });

  // Admin pending digest — 7 AM Mon–Sat.
  cron.schedule('0 7 * * 1-6', () => {
    console.log('[cron] Running time admin pending digest (7 AM)');
    triggerRoute('/api/time/cron/admin-pending-digest');
  }, { timezone: tz });

  // Weekly close-out — 7 AM Monday.
  cron.schedule('0 7 * * 1', () => {
    console.log('[cron] Running time weekly close-out (Mon 7 AM)');
    triggerRoute('/api/time/cron/weekly-closeout');
  }, { timezone: tz });

  console.log('[cron] All scheduled jobs registered');
}
