import { useState, useEffect, useCallback, useMemo } from 'react';
import { Network, ArrowDown, ArrowUp, Loader2, Server, Router } from 'lucide-react';
import { SystemCard } from '@/components/dashboard/SystemCard';
import { Badge } from '@/components/ui/badge';
import { HAEntity } from '@/lib/api/homeAssistant';
import { useSharedHAAllEntities } from '@/hooks/useHAEntitiesContext';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

function findLanEntity(allEntities: HAEntity[], pattern: string): HAEntity | undefined {
  return allEntities.find(e =>
    e.entity_id.startsWith('sensor.') &&
    e.entity_id.includes('system_monitor_') &&
    e.entity_id.includes(pattern)
  );
}

interface WanStats {
  rx_bytes: number | null;
  tx_bytes: number | null;
  rx_gb: number | null;
  tx_gb: number | null;
  link: boolean | null;
  wan_status: string;
}


function throughputColor(mbps: number): string {
  if (mbps >= 50) return 'text-emerald-400';
  if (mbps >= 10) return 'text-blue-400';
  if (mbps >= 1) return 'text-yellow-400';
  return 'text-muted-foreground';
}

function formatBytes(mib: number): string {
  if (mib >= 1024) return `${(mib / 1024).toFixed(2)} GiB`;
  return `${mib.toFixed(1)} MiB`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 mt-1">
      {children}
    </p>
  );
}

export function LanSpeedCard() {
  const { allEntities, loading: haLoading } = useSharedHAAllEntities();
  const [wanStats, setWanStats] = useState<WanStats | null>(null);
  const [wanLoading, setWanLoading] = useState(true);

  const throughputInEnt = useMemo(() => findLanEntity(allEntities, 'network_throughput_in'), [allEntities]);
  const throughputOutEnt = useMemo(() => findLanEntity(allEntities, 'network_throughput_out'), [allEntities]);
  const totalInEnt = useMemo(() => findLanEntity(allEntities, 'network_in_'), [allEntities]);
  const totalOutEnt = useMemo(() => findLanEntity(allEntities, 'network_out_'), [allEntities]);
  const ipEnt = useMemo(() => findLanEntity(allEntities, 'ipv4_address'), [allEntities]);

  const fetchWanStats = useCallback(async (silent = false) => {
    if (!silent) setWanLoading(true);
    try {
      const data = await apiClient.get<WanStats>('/api/fortigate/wan-stats');
      setWanStats(data);
    } catch {
      setWanStats(null);
    } finally {
      setWanLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWanStats();
    const interval = setInterval(() => fetchWanStats(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchWanStats]);

  const loading = haLoading || wanLoading;
  const hasLanData = Boolean(throughputInEnt || totalInEnt || ipEnt);
  const hasData = hasLanData || wanStats !== null;

  const throughputIn = parseFloat(throughputInEnt?.state ?? 'NaN');
  const throughputOut = parseFloat(throughputOutEnt?.state ?? 'NaN');
  const totalIn = parseFloat(totalInEnt?.state ?? 'NaN');
  const totalOut = parseFloat(totalOutEnt?.state ?? 'NaN');
  const ip = ipEnt?.state ?? '—';

  const wanRx = wanStats?.rx_gb ?? null;
  const wanTx = wanStats?.tx_gb ?? null;

  const inMbps = isNaN(throughputIn) ? 0 : throughputIn;
  const outMbps = isNaN(throughputOut) ? 0 : throughputOut;

  return (
    <SystemCard
      title="LAN & Network"
      icon={<Network className="h-6 w-6 text-teal-400" />}
      status={loading ? 'idle' : hasData ? 'online' : 'offline'}
      statusText={loading ? 'Loading...' : hasData ? (ip !== '—' ? ip : 'Connected') : 'No Data'}
      accentColor="bg-teal-500/10"
      metrics={[
        { label: 'LAN In', value: hasLanData ? `${inMbps.toFixed(2)} MB/s` : '—' },
        { label: 'LAN Out', value: hasLanData ? `${outMbps.toFixed(2)} MB/s` : '—' },
        { label: 'WAN Status', value: wanStats ? wanStats.wan_status : '—' },
        { label: 'HA Server IP', value: ip },
      ]}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center gap-3 py-8 px-4 text-center">
          <div className="rounded-full bg-teal-500/10 p-3">
            <Network className="h-6 w-6 text-teal-400" />
          </div>
          <div>
            <p className="text-sm font-semibold" data-testid="text-lan-empty">No LAN Data</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              LAN data comes from Home Assistant System Monitor sensors.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {hasLanData && (
            <>
              <div>
                <SectionLabel>HA Server — Live Throughput</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowDown className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-[10px] text-muted-foreground uppercase">Inbound</span>
                    </div>
                    <p className={cn('text-lg font-bold font-mono tabular-nums', throughputColor(inMbps))} data-testid="text-lan-throughput-in">
                      {inMbps.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">MB/s</span>
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowUp className="h-3.5 w-3.5 text-blue-400" />
                      <span className="text-[10px] text-muted-foreground uppercase">Outbound</span>
                    </div>
                    <p className={cn('text-lg font-bold font-mono tabular-nums', throughputColor(outMbps))} data-testid="text-lan-throughput-out">
                      {outMbps.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">MB/s</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border" />

              <div>
                <SectionLabel>Total Transfer — HA Server</SectionLabel>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                      <ArrowDown className="h-3 w-3 text-emerald-400" /> Total Received
                    </div>
                    <p className="font-mono font-semibold text-sm" data-testid="text-lan-total-in">
                      {isNaN(totalIn) ? '—' : formatBytes(totalIn)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                      <ArrowUp className="h-3 w-3 text-blue-400" /> Total Sent
                    </div>
                    <p className="font-mono font-semibold text-sm" data-testid="text-lan-total-out">
                      {isNaN(totalOut) ? '—' : formatBytes(totalOut)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {(wanRx !== null || wanTx !== null) && (
            <>
              <div className="border-t border-border" />

              <div>
                <SectionLabel>FortiGate WAN Transfer</SectionLabel>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                      <Router className="h-3 w-3 text-teal-400" /> WAN RX
                    </div>
                    <p className="font-mono font-semibold text-sm" data-testid="text-lan-wan-rx">
                      {wanRx !== null ? `${wanRx.toFixed(2)} GB` : '—'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                      <Router className="h-3 w-3 text-teal-400" /> WAN TX
                    </div>
                    <p className="font-mono font-semibold text-sm" data-testid="text-lan-wan-tx">
                      {wanTx !== null ? `${wanTx.toFixed(2)} GB` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="border-t border-border" />

          <div>
            <SectionLabel>Network Info</SectionLabel>
            <div className="flex items-center gap-2 flex-wrap">
              {ip !== '—' && (
                <Badge variant="outline" className="text-[10px] font-mono" data-testid="badge-lan-ip">
                  <Server className="h-3 w-3 mr-1" /> {ip}
                </Badge>
              )}
              {wanStats && (
                <Badge variant="outline" className="text-[10px] font-mono" data-testid="badge-lan-wan-status">
                  WAN: {wanStats.wan_status}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </SystemCard>
  );
}
