import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Droplets, Waves, Thermometer, Camera, Car, DollarSign, RefreshCw, CheckCircle2, Save } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface DiscoveredEntities {
  energy: Array<{ entity_id: string; name: string; device_class?: string; unit?: string }>;
  irrigation: Array<{ entity_id: string; name: string }>;
  climate: Array<{ entity_id: string; name: string }>;
  cameras: Array<{ entity_id: string; name: string; state: string }>;
  vehicles: Array<{ entity_id: string; name: string; state: string }>;
  pool: Array<{ entity_id: string; name: string; state: string }>;
  persons: Array<{ entity_id: string; name: string }>;
}

interface EntityMappings {
  energy: string[];
  irrigation: string[];
  pool: {
    pool_heater: string;
    spa_heater: string;
    pool_temp: string;
    spa_temp: string;
    pool_pump: string;
    spa_pump: string;
  };
  climate: string[];
  cameras: string[];
  vehicles: string[];
  utility_rates: {
    electricity_kwh_cost: number;
    water_hcf_cost: number;
  };
}

export default function EntityMappingsCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredEntities | null>(null);

  const [mappings, setMappings] = useState<EntityMappings>({
    energy: [],
    irrigation: [],
    pool: {
      pool_heater: '',
      spa_heater: '',
      pool_temp: '',
      spa_temp: '',
      pool_pump: '',
      spa_pump: '',
    },
    climate: [],
    cameras: [],
    vehicles: [],
    utility_rates: {
      electricity_kwh_cost: 0.28,
      water_hcf_cost: 12.50,
    },
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<EntityMappings>('/api/estate/settings/entity-mappings');
      if (data) {
        setMappings((prev) => ({
          ...prev,
          ...data,
          utility_rates: {
            ...prev.utility_rates,
            ...(data.utility_rates || {}),
          },
        }));
      }
    } catch (e) {
      console.error('Failed to load entity mappings:', e);
    } finally {
      setLoading(false);
    }
  };

  const discoverEntities = async () => {
    setDiscovering(true);
    try {
      const res = await apiClient.get<DiscoveredEntities>('/api/estate/ha/discover-entities');
      setDiscovered(res);
      toast({
        title: 'Entities Discovered',
        description: `Found ${res.energy.length} energy, ${res.climate.length} climate, ${res.cameras.length} cameras, and ${res.irrigation.length} irrigation entities in Home Assistant.`,
      });
    } catch (e) {
      toast({
        title: 'Discovery Failed',
        description: e instanceof Error ? e.message : 'Ensure Home Assistant is connected.',
        variant: 'destructive',
      });
    } finally {
      setDiscovering(false);
    }
  };

  useEffect(() => {
    loadData();
    discoverEntities();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.post('/api/estate/settings/entity-mappings', mappings);
      toast({
        title: 'Mappings Saved',
        description: 'Your hardware and entity mappings have been updated.',
      });
    } catch (e) {
      toast({
        title: 'Save Failed',
        description: e instanceof Error ? e.message : 'Could not save mappings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Device &amp; Entity Mappings
            </CardTitle>
            <CardDescription>
              Map generic Home Assistant entities (energy, irrigation, pool, climate, cameras, and vehicles) to Janus dashboard cards.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={discoverEntities}
              disabled={discovering}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${discovering ? 'animate-spin' : ''}`} />
              Auto-Discover
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || loading}
              className="gap-1.5 bg-primary"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save Mappings'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="utility" className="w-full">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4">
            <TabsTrigger value="utility" className="gap-1 text-xs">
              <DollarSign className="h-3.5 w-3.5" /> Rates
            </TabsTrigger>
            <TabsTrigger value="energy" className="gap-1 text-xs">
              <Zap className="h-3.5 w-3.5" /> Energy
            </TabsTrigger>
            <TabsTrigger value="climate" className="gap-1 text-xs">
              <Thermometer className="h-3.5 w-3.5" /> Climate
            </TabsTrigger>
            <TabsTrigger value="cameras" className="gap-1 text-xs">
              <Camera className="h-3.5 w-3.5" /> Cameras
            </TabsTrigger>
            <TabsTrigger value="irrigation" className="gap-1 text-xs">
              <Droplets className="h-3.5 w-3.5" /> Irrigation
            </TabsTrigger>
            <TabsTrigger value="pool" className="gap-1 text-xs">
              <Waves className="h-3.5 w-3.5" /> Pool &amp; Spa
            </TabsTrigger>
          </TabsList>

          {/* Utility Rates */}
          <TabsContent value="utility" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="elec-rate">Electricity Rate ($/kWh)</Label>
                <Input
                  id="elec-rate"
                  type="number"
                  step="0.01"
                  value={mappings.utility_rates.electricity_kwh_cost}
                  onChange={(e) =>
                    setMappings((prev) => ({
                      ...prev,
                      utility_rates: {
                        ...prev.utility_rates,
                        electricity_kwh_cost: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                  placeholder="0.28"
                />
                <p className="text-xs text-muted-foreground">
                  Used to estimate hourly and daily electricity circuit costs across all energy cards.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="water-rate">Water Rate ($/HCF or kGal)</Label>
                <Input
                  id="water-rate"
                  type="number"
                  step="0.10"
                  value={mappings.utility_rates.water_hcf_cost}
                  onChange={(e) =>
                    setMappings((prev) => ({
                      ...prev,
                      utility_rates: {
                        ...prev.utility_rates,
                        water_hcf_cost: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                  placeholder="12.50"
                />
                <p className="text-xs text-muted-foreground">
                  Used by irrigation and water intelligence trackers for tiered bill estimation.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Energy Mappings */}
          <TabsContent value="energy" className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Discovered {discovered?.energy.length || 0} power and energy sensors in Home Assistant. Janus monitors these for real-time load, circuit breakdown, and cost estimation.
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-muted/20">
              {discovered?.energy.map((sensor) => (
                <div key={sensor.entity_id} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{sensor.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{sensor.entity_id}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {sensor.unit || sensor.device_class || 'sensor'}
                  </Badge>
                </div>
              ))}
              {(!discovered || discovered.energy.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">No energy sensors discovered in Home Assistant yet.</p>
              )}
            </div>
          </TabsContent>

          {/* Climate Mappings */}
          <TabsContent value="climate" className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Discovered {discovered?.climate.length || 0} climate entities (thermostats &amp; HVAC zones) in Home Assistant.
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-muted/20">
              {discovered?.climate.map((clim) => (
                <div key={clim.entity_id} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{clim.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{clim.entity_id}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">climate</Badge>
                </div>
              ))}
              {(!discovered || discovered.climate.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">No climate entities discovered.</p>
              )}
            </div>
          </TabsContent>

          {/* Cameras Mappings */}
          <TabsContent value="cameras" className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Discovered {discovered?.cameras.length || 0} camera entities in Home Assistant. Any brand (UniFi Protect, Reolink, Nest, Ring, generic RTSP) is automatically supported.
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-muted/20">
              {discovered?.cameras.map((cam) => (
                <div key={cam.entity_id} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{cam.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{cam.entity_id}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{cam.state}</Badge>
                </div>
              ))}
              {(!discovered || discovered.cameras.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">No camera entities discovered in Home Assistant.</p>
              )}
            </div>
          </TabsContent>

          {/* Irrigation Mappings */}
          <TabsContent value="irrigation" className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Discovered {discovered?.irrigation.length || 0} sprinkler valves and switches in Home Assistant.
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-muted/20">
              {discovered?.irrigation.map((v) => (
                <div key={v.entity_id} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{v.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{v.entity_id}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">valve</Badge>
                </div>
              ))}
              {(!discovered || discovered.irrigation.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">No irrigation entities discovered in Home Assistant.</p>
              )}
            </div>
          </TabsContent>

          {/* Pool & Spa Mappings */}
          <TabsContent value="pool" className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Configure your pool and spa sensors, heaters, and pumps to link them to the Pool &amp; Spa card.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Pool Temp Sensor</Label>
                <Input
                  placeholder="domain.entity_id"
                  value={mappings.pool.pool_temp}
                  onChange={(e) =>
                    setMappings((prev) => ({
                      ...prev,
                      pool: { ...prev.pool, pool_temp: e.target.value },
                    }))
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Spa Temp Sensor</Label>
                <Input
                  placeholder="domain.entity_id"
                  value={mappings.pool.spa_temp}
                  onChange={(e) =>
                    setMappings((prev) => ({
                      ...prev,
                      pool: { ...prev.pool, spa_temp: e.target.value },
                    }))
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pool Heater Switch</Label>
                <Input
                  placeholder="domain.entity_id"
                  value={mappings.pool.pool_heater}
                  onChange={(e) =>
                    setMappings((prev) => ({
                      ...prev,
                      pool: { ...prev.pool, pool_heater: e.target.value },
                    }))
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Spa Heater Switch</Label>
                <Input
                  placeholder="domain.entity_id"
                  value={mappings.pool.spa_heater}
                  onChange={(e) =>
                    setMappings((prev) => ({
                      ...prev,
                      pool: { ...prev.pool, spa_heater: e.target.value },
                    }))
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pool Pump Switch</Label>
                <Input
                  placeholder="domain.entity_id"
                  value={mappings.pool.pool_pump}
                  onChange={(e) =>
                    setMappings((prev) => ({
                      ...prev,
                      pool: { ...prev.pool, pool_pump: e.target.value },
                    }))
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Spa Pump Switch</Label>
                <Input
                  placeholder="domain.entity_id"
                  value={mappings.pool.spa_pump}
                  onChange={(e) =>
                    setMappings((prev) => ({
                      ...prev,
                      pool: { ...prev.pool, spa_pump: e.target.value },
                    }))
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
