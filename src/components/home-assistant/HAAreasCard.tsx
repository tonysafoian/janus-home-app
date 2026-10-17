import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { SystemCard } from '@/components/dashboard/SystemCard';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Home,
  Lightbulb,
  Thermometer,
  Lock,
  DoorClosed,
  Zap,
  Tv,
  Power,
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AreaEntity {
  entity_id: string;
  name: string;
  state?: string;
  domain: string;
  attributes?: Record<string, unknown>;
}

export interface HAArea {
  area_id: string;
  name: string;
  picture?: string | null;
  icon?: string | null;
  floor_id?: string | null;
  aliases?: string[];
  entities: AreaEntity[];
}

function getDomainIcon(domain: string) {
  switch (domain) {
    case 'light':
      return Lightbulb;
    case 'climate':
      return Thermometer;
    case 'lock':
      return Lock;
    case 'binary_sensor':
    case 'sensor':
      return Zap;
    case 'media_player':
      return Tv;
    default:
      return Power;
  }
}

export function HAAreasCard() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{ success: boolean; areas: HAArea[] }>({
    queryKey: ['ha-areas'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; areas: HAArea[] }>('/api/ha/areas');
      return res;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ entity_id, service }: { entity_id: string; service: 'turn_on' | 'turn_off' | 'toggle' }) => {
      const domain = entity_id.split('.')[0];
      return await apiClient.post('/api/ha', {
        action: 'call-service',
        domain,
        service,
        serviceData: { entity_id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ha-areas'] });
    },
  });

  const areas = data?.areas || [];

  const filteredAreas = useMemo(() => {
    if (!searchTerm.trim()) return areas;
    const term = searchTerm.toLowerCase();
    return areas
      .map(area => {
        const matchesArea = area.name.toLowerCase().includes(term);
        const matchingEntities = area.entities.filter(
          e => e.name.toLowerCase().includes(term) || e.entity_id.toLowerCase().includes(term)
        );
        if (matchesArea) return area;
        if (matchingEntities.length > 0) {
          return { ...area, entities: matchingEntities };
        }
        return null;
      })
      .filter((a): a is HAArea => a !== null);
  }, [areas, searchTerm]);

  const totalEntities = useMemo(() => {
    return areas.reduce((sum, a) => sum + a.entities.length, 0);
  }, [areas]);

  return (
    <SystemCard
      title="Areas & Rooms"
      icon={<Home className="h-6 w-6 text-primary" />}
      status={isLoading ? 'idle' : error ? 'warning' : 'online'}
      statusText={isLoading ? 'Loading…' : `${areas.length} areas`}
      metrics={[
        { label: 'Areas', value: `${areas.length}` },
        { label: 'Devices', value: `${totalEntities}` },
      ]}
      expandable={false}
      defaultExpanded={true}
    >
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search areas, rooms, or devices..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading Home Assistant areas and devices...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            Could not fetch Home Assistant areas. Check Home Assistant connection.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredAreas.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-muted/40 text-muted-foreground mb-1">
              <Home className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">No areas found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchTerm
                ? 'No areas or devices match your search query.'
                : 'Configure areas in Home Assistant (Settings → Areas & Zones) to group and organize your smart home devices.'}
            </p>
          </div>
        )}

        {/* Areas list */}
        {!isLoading && filteredAreas.length > 0 && (
          <div className="space-y-2.5">
            {filteredAreas.map(area => {
              const isExpanded = expandedAreaId === area.area_id || (Boolean(searchTerm) && area.entities.length > 0);
              const activeCount = area.entities.filter(
                e => e.state === 'on' || (e.domain === 'climate' && e.state !== 'off')
              ).length;

              return (
                <div
                  key={area.area_id}
                  className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden transition-colors"
                >
                  {/* Area header row */}
                  <button
                    type="button"
                    onClick={() => setExpandedAreaId(isExpanded ? null : area.area_id)}
                    className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Home className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold truncate flex items-center gap-2">
                          {area.name}
                          {activeCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-500 font-normal">
                              {activeCount} active
                            </Badge>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {area.entities.length} {area.entities.length === 1 ? 'entity' : 'entities'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </button>

                  {/* Expanded entities view */}
                  {isExpanded && (
                    <div className="border-t border-border/40 bg-muted/10 p-3 space-y-1.5">
                      {area.entities.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2 px-1">
                          No devices assigned to this area yet.
                        </p>
                      ) : (
                        area.entities.map(entity => {
                          const Icon = getDomainIcon(entity.domain);
                          const isActionable = ['light', 'switch'].includes(entity.domain);
                          const isOn = entity.state === 'on';

                          return (
                            <div
                              key={entity.entity_id}
                              className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 mr-2">
                                <Icon className={cn('h-3.5 w-3.5 shrink-0', isOn ? 'text-amber-500' : 'text-muted-foreground')} />
                                <span className="font-medium truncate">{entity.name}</span>
                                <span className="text-[10px] text-muted-foreground/60 hidden sm:inline truncate">
                                  ({entity.entity_id})
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={cn(
                                    'tabular-nums text-[11px] capitalize',
                                    isOn ? 'text-amber-500 font-medium' : 'text-muted-foreground'
                                  )}
                                >
                                  {entity.state ?? 'unknown'}
                                  {entity.attributes?.unit_of_measurement
                                    ? ` ${entity.attributes.unit_of_measurement}`
                                    : ''}
                                </span>

                                {isActionable && (
                                  <Button
                                    size="sm"
                                    variant={isOn ? 'default' : 'outline'}
                                    className="h-6 px-2 text-[10px]"
                                    disabled={toggleMutation.isPending}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleMutation.mutate({
                                        entity_id: entity.entity_id,
                                        service: isOn ? 'turn_off' : 'turn_on',
                                      });
                                    }}
                                  >
                                    <Power className="h-3 w-3 mr-1" />
                                    {isOn ? 'Off' : 'On'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SystemCard>
  );
}
