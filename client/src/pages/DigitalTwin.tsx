import { Suspense, lazy, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Cloud, Droplets, Wind, Thermometer, Play, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentWeather } from '@/hooks/useWeather';
import { useRunSimulation } from '@/hooks/useDigitalTwin';
import { SocialSignalsCard } from '@/components/digitalTwin/SocialSignalsCard';
import { cn } from '@/lib/utils';
import type { SimulationOutput } from '@/hooks/useDigitalTwin';

const RiskMap = lazy(() => import('@/components/digitalTwin/RiskMap'));

function MapFallback() {
  return <div className="h-[360px] w-full animate-pulse rounded-lg border border-border bg-sand/60" aria-label="Loading map" />;
}

// Cities span different climate zones (not just Mumbai neighborhoods) so
// picking one actually changes what live weather looks like.
const CITIES = [
  { lat: 19.2183, lng: 72.9781, name: 'Thane' },
  { lat: 19.076, lng: 72.8777, name: 'Mumbai' },
  { lat: 18.5204, lng: 73.8567, name: 'Pune' },
  { lat: 28.6139, lng: 77.209, name: 'Delhi' },
  { lat: 12.9716, lng: 77.5946, name: 'Bengaluru' },
  { lat: 13.0827, lng: 80.2707, name: 'Chennai' },
  { lat: 22.5726, lng: 88.3639, name: 'Kolkata' },
];

export default function DigitalTwinPage() {
  const [params] = useSearchParams();
  const requirementId = params.get('requirementId') || 'demo-requirement';

  // Event location — changing this is one of the required what-if
  // parameters (alongside rainfall/duration/temperature/wind).
  const [location, setLocation] = useState(CITIES[0]);

  // Live weather
  const liveWeather = useCurrentWeather(location.lat, location.lng, location.name);

  // What-if parameters
  const [rainfall, setRainfall] = useState(0);
  const [stormDuration, setStormDuration] = useState(0);
  const [temperature, setTemperature] = useState(28);
  const [windSpeed, setWindSpeed] = useState(12);

  // Simulation
  const simulation = useRunSimulation();
  const [result, setResult] = useState<SimulationOutput | null>(null);

  const handleRunSimulation = async () => {
    const sim = await simulation.mutateAsync({
      requirementId,
      rainfall: Math.round(rainfall),
      stormDuration: Math.round(stormDuration),
      temperature: Math.round(temperature * 10) / 10,
      windSpeed: Math.round(windSpeed * 10) / 10,
      location: location.name,
      latitude: location.lat,
      longitude: location.lng,
    });
    setResult(sim);
  };

  const handleReset = () => {
    setRainfall(0);
    setStormDuration(0);
    setTemperature(28);
    setWindSpeed(12);
    setResult(null);
  };

  // Determine weather severity color — uses the site's warm palette tokens
  // (conflict/marigold/peacock) instead of raw red/yellow/green so risk
  // states read as part of the theme, not a bootstrap alert box.
  const getRiskColor = (risk: 'LOW' | 'MEDIUM' | 'HIGH') => {
    if (risk === 'HIGH') return 'bg-conflict/10 border-conflict/30 text-conflict';
    if (risk === 'MEDIUM') return 'bg-marigold/25 border-marigold/40 text-ink';
    return 'bg-available/10 border-available/30 text-available';
  };

  const getRiskIcon = (risk: 'LOW' | 'MEDIUM' | 'HIGH') => {
    return risk === 'HIGH' ? '⚠️' : risk === 'MEDIUM' ? '⚡' : '✓';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <p className="eyebrow">Digital Twin</p>
        <h1 className="mt-2 text-4xl leading-[1.05] tracking-tightest md:text-5xl">
          Weather-aware <em>operations</em>
        </h1>
        <p className="mt-4 text-muted">Simulate how weather impacts your fulfillment network</p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Left Column: Live Weather & Simulation Controls */}
        <div className="space-y-6">
          {/* Live Weather Card */}
          <div className="surface rounded-lg border p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Live Weather</h2>
              <div className="flex items-center gap-2">
                <select
                  value={location.name}
                  onChange={(e) => setLocation(CITIES.find((c) => c.name === e.target.value) ?? CITIES[0])}
                  disabled={simulation.isPending}
                  className="rounded-md border border-border bg-card px-2 py-1 text-sm text-text"
                  aria-label="Event location"
                >
                  {CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="inline-flex items-center gap-1 rounded-full bg-peacock/10 px-2.5 py-1 text-xs text-peacock">
                  <Cloud className="size-3" />
                  LIVE DATA
                </span>
              </div>
            </div>

            {liveWeather.isPending ? (
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-sand" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-sand" />
              </div>
            ) : liveWeather.error ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <AlertCircle className="size-4" />
                Unable to load live weather
              </div>
            ) : liveWeather.data ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Location</span>
                  <span className="font-mono font-semibold">{liveWeather.data.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted">
                    <Thermometer className="size-4" /> Temperature
                  </span>
                  <span className="font-mono font-semibold">{liveWeather.data.temperature}°C</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted">
                    <Droplets className="size-4" /> Rainfall
                  </span>
                  <span className="font-mono font-semibold">{liveWeather.data.rainfall.toFixed(1)}mm</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted">
                    <Wind className="size-4" /> Wind
                  </span>
                  <span className="font-mono font-semibold">{liveWeather.data.windSpeed.toFixed(1)} km/h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Condition</span>
                  <span className="capitalize">{liveWeather.data.weatherCondition}</span>
                </div>
                <div className="flex items-center justify-between pt-2 text-xs text-muted">
                  <span>Source: {liveWeather.data.source}</span>
                  <span>{new Date(liveWeather.data.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* What-If Simulation Controls */}
          <div className="surface rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">What-If Scenario</h2>

            <div className="space-y-6">
              {/* Rainfall Slider */}
              <div>
                <label className="block text-sm font-medium">
                  Rainfall: <span className="font-mono">{rainfall.toFixed(1)} mm</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="150"
                  step="5"
                  value={rainfall}
                  onChange={(e) => setRainfall(Number(e.target.value))}
                  className="mt-2 w-full"
                  disabled={simulation.isPending}
                />
                <div className="mt-1 flex justify-between text-xs text-muted">
                  <span>0mm (None)</span>
                  <span>150mm (Extreme)</span>
                </div>
              </div>

              {/* Storm Duration Slider */}
              <div>
                <label className="block text-sm font-medium">
                  Storm Duration: <span className="font-mono">{stormDuration.toFixed(0)} h</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="24"
                  step="1"
                  value={stormDuration}
                  onChange={(e) => setStormDuration(Number(e.target.value))}
                  className="mt-2 w-full"
                  disabled={simulation.isPending}
                />
                <div className="mt-1 flex justify-between text-xs text-muted">
                  <span>0h (No storm)</span>
                  <span>24h (All day)</span>
                </div>
              </div>

              {/* Temperature Slider */}
              <div>
                <label className="block text-sm font-medium">
                  Temperature: <span className="font-mono">{temperature.toFixed(1)}°C</span>
                </label>
                <input
                  type="range"
                  min="-10"
                  max="50"
                  step="1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="mt-2 w-full"
                  disabled={simulation.isPending}
                />
                <div className="mt-1 flex justify-between text-xs text-muted">
                  <span>-10°C (Cold)</span>
                  <span>50°C (Hot)</span>
                </div>
              </div>

              {/* Wind Speed Slider */}
              <div>
                <label className="block text-sm font-medium">
                  Wind Speed: <span className="font-mono">{windSpeed.toFixed(1)} km/h</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(Number(e.target.value))}
                  className="mt-2 w-full"
                  disabled={simulation.isPending}
                />
                <div className="mt-1 flex justify-between text-xs text-muted">
                  <span>0 km/h (Calm)</span>
                  <span>100 km/h (Extreme)</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                <Button onClick={handleRunSimulation} disabled={simulation.isPending} className="flex-1">
                  <Play className="size-4" />
                  {simulation.isPending ? 'Running...' : 'Run Simulation'}
                </Button>
                <Button onClick={handleReset} variant="outline" disabled={simulation.isPending}>
                  <RotateCw className="size-4" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Simulation Results */}
        <div className="space-y-6">
          {/* Results Card */}
          {result ? (
            <div className="space-y-4">
              {/* Fulfillment Summary */}
              <div className={cn('rounded-lg border p-6', getRiskColor(result.fulfillmentRisk))}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">Projected Fulfillment</h3>
                  <span className="text-2xl">{getRiskIcon(result.fulfillmentRisk)}</span>
                </div>
                <div className="text-sm">
                  <span className="font-mono text-lg font-bold">{result.projectedFulfillmentPercent}%</span>
                  <span className="ml-2 text-sm opacity-75">({result.baselineFulfillmentPercent}% baseline)</span>
                </div>
                <div className="mt-2 text-sm opacity-75">
                  {result.unitsAtRisk > 0 ? (
                    <>
                      <span className="font-semibold">{result.unitsAtRisk} units at risk</span>
                    </>
                  ) : (
                    'All units safe'
                  )}
                </div>
                <div className="mt-3 text-xs opacity-50">
                  <strong>SIMULATED</strong> / <strong>PROJECTED</strong>
                </div>
              </div>

              {/* Affected Providers */}
              {result.affectedProviders.length > 0 && (
                <div className="surface rounded-lg border p-6">
                  <h3 className="mb-4 font-semibold">Affected Providers</h3>
                  <div className="space-y-3">
                    {result.affectedProviders.map((provider) => (
                      <div key={provider.providerId} className={cn('rounded-lg border p-3', getRiskColor(provider.logisticsRisk))}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{provider.providerName}</p>
                            <p className="text-sm opacity-75">Risk: {provider.logisticsRisk}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-semibold">
                              {provider.projectedFulfillment}/{provider.baselineFulfillment}
                            </p>
                            <p className="text-sm opacity-75">units</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weather Impacts */}
              {result.impacts.length > 0 && (
                <div className="surface rounded-lg border p-6">
                  <h3 className="mb-4 font-semibold">Weather Impacts</h3>
                  <div className="space-y-2">
                    {result.impacts.slice(0, 3).map((impact, i) => (
                      <div key={i} className="text-sm">
                        <p className="font-medium">{impact.type}</p>
                        <p className="text-muted">{impact.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted">
                <p className="mb-1">
                  ⓘ <strong>Simulation note</strong>: This is a what-if scenario. No real bookings or data have been
                  modified.
                </p>
              </div>
            </div>
          ) : (
            <div className="surface rounded-lg border p-12 text-center">
              <Cloud className="mx-auto mb-4 size-8 text-sand" />
              <p className="text-muted">Configure a what-if scenario and run simulation to see projected impacts</p>
            </div>
          )}
        </div>
      </div>

      {/* Geospatial risk map — only meaningful once a simulation has run;
          reuses the Discover page's Leaflet setup rather than a new map lib. */}
      {result && (
        <div className="surface rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Impact Map</h2>
            <span className="text-xs text-muted">Pin color = simulated risk, not live conditions</span>
          </div>
          <Suspense fallback={<MapFallback />}>
            <RiskMap eventLocation={result.eventLocation} providers={result.affectedProviders} />
          </Suspense>
        </div>
      )}

      {/* Real-world public signals — independent of whether a simulation has
          run, since news coverage of current conditions is useful either way. */}
      <SocialSignalsCard
        location={result?.eventLocation.name ?? location.name}
        weatherCondition={liveWeather.data?.weatherCondition ?? 'rain'}
      />
    </div>
  );
}
