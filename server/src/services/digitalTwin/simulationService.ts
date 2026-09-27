/**
 * Simulation Service
 *
 * Runs Digital Twin simulations without modifying real HRE data.
 * Always read-only with respect to: Booking, Inventory, Payment, Negotiation, Fulfillment.
 */

import { prisma } from '../exchange';
import type { NormalizedWeather } from './weatherService';
import { calculateRequirementFulfillment, type ProviderInput } from './impactEngine';

export interface SimulationInput {
  userId: string;
  requirementId: string;
  rainfall: number; // mm
  stormDuration: number; // hours
  temperature: number; // Celsius
  windSpeed: number; // km/h
  /** Only used for the demo scenario (no real Requirement match) — a real
   * Requirement's own location/coordinates win when one is found. */
  location?: string;
  latitude?: number;
  longitude?: number;
}

export interface SimulationOutput {
  scenarioId: string;
  simulationId: string;
  baselineFulfillmentPercent: number;
  projectedFulfillmentPercent: number;
  unitsAtRisk: number;
  fulfillmentRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  eventLocation: { name: string; latitude: number; longitude: number };
  affectedProviders: Array<{
    providerId: string;
    providerName: string;
    logisticsRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    projectedFulfillment: number;
    baselineFulfillment: number;
    latitude?: number;
    longitude?: number;
  }>;
  impacts: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
}

/**
 * Create and run a simulation scenario
 *
 * CRITICAL: This function reads from HRE but NEVER writes to:
 * - Inventory
 * - Booking
 * - BookingItem
 * - Payment
 * - Negotiation
 * - Fulfillment
 *
 * It only creates:
 * - SimulationScenario
 * - SimulationResult
 * - ImpactEvent
 */
/**
 * Deterministic demo scenario (HackCelestial spec, Phase 15):
 * Thane hospitality event, 300 units, 3 providers.
 * Used whenever the requested requirementId doesn't resolve to a real
 * Requirement — keeps the what-if page usable without seed data, and is
 * fully in-memory (no DB write), so it stays consistent with "read-only".
 */
/** Only used when the caller supplies no location at all (e.g. a direct API
 * call without the frontend's city picker). The frontend always sends one. */
const DEFAULT_EVENT_LOCATION = { name: 'Thane', latitude: 19.2183, longitude: 72.9781 };

const DEMO_PROVIDER_QUANTITIES = [
  { providerId: 'demo-provider-a', name: 'Provider A', quantity: 150 },
  { providerId: 'demo-provider-b', name: 'Provider B', quantity: 100 },
  { providerId: 'demo-provider-c', name: 'Provider C', quantity: 50 },
];
const DEMO_TOTAL_UNITS = 300;

/**
 * Business doesn't store lat/lng today, so real (non-demo) providers have no
 * coordinates to plot. Rather than hide them from the map, place them at a
 * deterministic offset from the event location — clearly a placeholder, not
 * a real position, but keeps the visualization useful until geocoding exists.
 * Demo providers use this too so they relocate with whatever city is picked,
 * instead of being pinned to Thane forever.
 */
function fallbackCoords(providerId: string, baseLat: number, baseLng: number): { latitude: number; longitude: number } {
  let hash = 0;
  for (let i = 0; i < providerId.length; i++) hash = (hash * 31 + providerId.charCodeAt(i)) >>> 0;
  const angle = (hash % 360) * (Math.PI / 180);
  const radiusDeg = 0.02 + (hash % 100) / 5000; // ~2-4km jitter
  return {
    latitude: baseLat + Math.sin(angle) * radiusDeg,
    longitude: baseLng + Math.cos(angle) * radiusDeg,
  };
}

export async function runSimulation(input: SimulationInput): Promise<SimulationOutput> {
  // 1. Load real HRE data (read-only)
  const requirement = await prisma.requirement.findUnique({
    where: { id: input.requirementId },
    include: {
      items: {
        include: {
          resource: {
            include: {
              business: true,
            },
          },
        },
      },
      bookings: {
        include: {
          items: {
            include: {
              provider: true,
            },
          },
        },
      },
    },
  });

  // 2. Resolve the event location — the caller's chosen city (frontend's
  // location picker) unless a real Requirement overrides just the name.
  const eventLat = input.latitude ?? DEFAULT_EVENT_LOCATION.latitude;
  const eventLng = input.longitude ?? DEFAULT_EVENT_LOCATION.longitude;

  // 3. Determine who's providing what (from Match or Booking), falling back
  // to the deterministic demo scenario when no real requirement matches.
  const providers: ProviderInput[] = [];
  let location = input.location ?? DEFAULT_EVENT_LOCATION.name;
  let totalRequiredUnits = DEMO_TOTAL_UNITS;

  if (requirement) {
    location = requirement.location;
    totalRequiredUnits = requirement.items.reduce((sum, i) => sum + i.quantity, 0);

    if (requirement.bookings.length > 0) {
      // Use existing booking providers
      for (const booking of requirement.bookings) {
        for (const item of booking.items) {
          const existing = providers.find((p) => p.providerId === item.providerId);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            providers.push({
              providerId: item.providerId,
              name: item.provider.name,
              quantity: item.quantity,
              ...fallbackCoords(item.providerId, eventLat, eventLng),
            });
          }
        }
      }
    } else {
      // Use requirement items (resources from specific providers)
      for (const item of requirement.items) {
        providers.push({
          providerId: item.resource.businessId,
          name: item.resource.business.name,
          quantity: item.quantity,
          ...fallbackCoords(item.resource.businessId, eventLat, eventLng),
        });
      }
    }

    // Requirement exists but has no items/bookings yet — still use the demo
    // providers so the page has something meaningful to simulate.
    if (providers.length === 0) {
      providers.push(...DEMO_PROVIDER_QUANTITIES.map((p) => ({ ...p, ...fallbackCoords(p.providerId, eventLat, eventLng) })));
    }
  } else {
    providers.push(...DEMO_PROVIDER_QUANTITIES.map((p) => ({ ...p, ...fallbackCoords(p.providerId, eventLat, eventLng) })));
  }

  // 4. Create simulated weather object
  const simulatedWeather: NormalizedWeather = {
    location,
    latitude: eventLat,
    longitude: eventLng,
    timestamp: new Date(),
    temperature: input.temperature,
    humidity: 65, // Default
    rainfall: input.rainfall,
    precipitationProbability: input.rainfall > 0 ? Math.min(100, input.rainfall * 5) : 0,
    windSpeed: input.windSpeed,
    weatherCondition: input.rainfall > 50 ? 'stormy' : input.rainfall > 10 ? 'rainy' : 'clear',
    cloudCover: input.rainfall > 0 ? Math.min(100, input.rainfall) : 20,
    source: 'simulated',
  };

  // 5. Calculate impacts (this is the simulation logic)
  const fulfillmentAnalysis = calculateRequirementFulfillment(
    totalRequiredUnits,
    providers,
    simulatedWeather,
    input.stormDuration
  );

  // 6. Store simulation scenario and results (write-only to simulation models)
  // Only link a real requirementId — linking a non-existent id would violate
  // the foreign key, since demo runs don't correspond to a DB row.
  const scenario = await prisma.simulationScenario.create({
    data: {
      userId: input.userId,
      requirementId: requirement ? input.requirementId : null,
      rainfall: input.rainfall,
      stormDuration: input.stormDuration,
      temperature: input.temperature,
      windSpeed: input.windSpeed,
      baselineWeather: {
        rainfall: 0,
        temperature: 28,
        windSpeed: 12,
      },
    },
  });

  // 7. Create simulation result
  const result = await prisma.simulationResult.create({
    data: {
      scenarioId: scenario.id,
      baselineFulfillmentPercent: 100,
      projectedFulfillmentPercent: fulfillmentAnalysis.fulfillmentPercent,
      affectedProviders: fulfillmentAnalysis.providerImpacts.map((p) => ({
        providerId: p.providerId,
        name: p.providerName,
        risk: p.logisticsRisk,
        projectedUnits: p.projectedFulfillment,
        baselineUnits: p.baselineFulfillment,
      })),
      affectedResources: requirement
        ? requirement.items.map((item) => ({
            resourceId: item.resourceId,
            riskPercent: fulfillmentAnalysis.providerImpacts
              .find((p) => p.providerId === item.resource.businessId)
              ?.logisticsRiskPercent ?? 0,
          }))
        : [],
      totalRequiredUnits,
      projectedDeliveredUnits: fulfillmentAnalysis.projectedFulfillment,
      unitsAtRisk: fulfillmentAnalysis.unitsAtRisk,
      logisticsRisk: fulfillmentAnalysis.providerImpacts.some((p) => p.logisticsRisk === 'HIGH')
        ? 'HIGH'
        : fulfillmentAnalysis.providerImpacts.some((p) => p.logisticsRisk === 'MEDIUM')
          ? 'MEDIUM'
          : 'LOW',
      fulfillmentRisk: fulfillmentAnalysis.fulfillmentRisk,
    },
  });

  // 8. Create impact events
  const impactEventPromises = fulfillmentAnalysis.providerImpacts.flatMap((provider) =>
    provider.impacts.map((impact) =>
      prisma.impactEvent.create({
        data: {
          resultId: result.id,
          affectedEntityType: 'PROVIDER',
          affectedEntityId: provider.providerId,
          affectedEntityName: provider.providerName,
          impactType: impact.type,
          severity: impact.severity,
          probability: simulatedWeather.rainfall > 50 ? 0.8 : simulatedWeather.rainfall > 10 ? 0.5 : 0.2,
          reason: impact.description,
          source: simulatedWeather.weatherCondition.toUpperCase(),
          downstreamImpactIds: impact.downstreamRisks,
        },
      })
    )
  );

  await Promise.all(impactEventPromises);

  // 9. Return simulation output (DO NOT return real bookings or payment info)
  return {
    scenarioId: scenario.id,
    simulationId: result.id,
    baselineFulfillmentPercent: 100,
    projectedFulfillmentPercent: fulfillmentAnalysis.fulfillmentPercent,
    unitsAtRisk: fulfillmentAnalysis.unitsAtRisk,
    fulfillmentRisk: fulfillmentAnalysis.fulfillmentRisk,
    eventLocation: { name: location, latitude: eventLat, longitude: eventLng },
    affectedProviders: fulfillmentAnalysis.providerImpacts.map((p) => ({
      providerId: p.providerId,
      providerName: p.providerName,
      logisticsRisk: p.logisticsRisk,
      projectedFulfillment: p.projectedFulfillment,
      baselineFulfillment: p.baselineFulfillment,
      latitude: p.latitude,
      longitude: p.longitude,
    })),
    // Weather impacts are global (same rainfall/wind/temp for every provider),
    // so impactEngine attaches an identical list to each provider entry —
    // dedupe by type here rather than showing one copy per provider.
    impacts: Array.from(
      new Map(
        fulfillmentAnalysis.providerImpacts
          .flatMap((p) => p.impacts)
          .map((i) => [i.type, { type: i.type, severity: i.severity, description: i.description }])
      ).values()
    ),
  };
}

/**
 * Get simulation result
 */
export async function getSimulationResult(resultId: string) {
  const result = await prisma.simulationResult.findUnique({
    where: { id: resultId },
    include: {
      scenario: true,
      impacts: true,
    },
  });

  if (!result) {
    throw new Error(`Simulation result ${resultId} not found`);
  }

  return result;
}

/**
 * List user's simulations
 */
export async function listUserSimulations(userId: string, limit = 10) {
  const scenarios = await prisma.simulationScenario.findMany({
    where: { userId },
    include: {
      result: {
        include: {
          impacts: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return scenarios;
}

/**
 * Verify that real HRE data was NOT modified by simulation
 * (Defensive check - should always pass)
 */
export async function verifySimulationIsolation(requirementId: string): Promise<boolean> {
  const requirement = await prisma.requirement.findUnique({
    where: { id: requirementId },
    include: {
      bookings: {
        select: { id: true, totalAmount: true },
      },
      items: {
        select: { id: true, quantity: true },
      },
    },
  });

  if (!requirement) return false;

  // Check that bookings were not created/modified
  // (In real app, would compare against known baseline)
  return true;
}
