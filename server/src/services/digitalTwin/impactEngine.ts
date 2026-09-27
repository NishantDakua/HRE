/**
 * Impact Engine
 *
 * Calculates direct and cascading impacts of weather on HRE fulfillment.
 * All rules are configurable and transparent (no black-box AI scores).
 */

import type { NormalizedWeather } from './weatherService';

export interface ProviderInput {
  providerId: string;
  name: string;
  quantity: number;
  latitude?: number;
  longitude?: number;
}

export interface ProviderImpact {
  providerId: string;
  providerName: string;
  quantity: number;
  baselineFulfillment: number; // Expected units to deliver
  logisticsRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  logisticsRiskPercent: number; // 0-100
  projectedFulfillment: number; // Units likely to deliver
  impacts: DirectImpact[]; // Chain of impacts
  latitude?: number; // Carried through for map visualization only
  longitude?: number;
}

export interface DirectImpact {
  type: string; // "HEAVY_RAINFALL" | "EXTREME_HEAT" | "HIGH_WIND" | etc.
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  affectedEntities: string[]; // What this impacts
  downstreamRisks: string[]; // What this causes
  description: string;
}

/**
 * Impact thresholds (configurable)
 */
const IMPACT_CONFIG = {
  // Rainfall thresholds (mm/hour)
  rainfall: {
    LOW: { min: 0, max: 10, logisticsRisk: 0.1 },      // Light rain, 10% risk
    MEDIUM: { min: 10, max: 50, logisticsRisk: 0.4 },  // Moderate rain, 40% risk
    HIGH: { min: 50, max: Infinity, logisticsRisk: 0.8 }, // Heavy rain, 80% risk
  },
  // Temperature extremes (Celsius)
  temperature: {
    COLD_EXTREME: { max: 0, capacityReduction: 0.3 }, // -30C or below
    COLD_HIGH: { max: 10, capacityReduction: 0.1 },    // Below 10C
    HEAT_HIGH: { min: 40, capacityReduction: 0.2 },    // 40C or above
    HEAT_EXTREME: { min: 45, capacityReduction: 0.4 }, // 45C or above
  },
  // Wind speed (km/h)
  windSpeed: {
    LOW: { max: 20, risk: 0 },                     // Light wind, no issue
    MEDIUM: { max: 40, risk: 0.15 },               // Moderate wind
    HIGH: { max: 60, risk: 0.4 },                  // Strong wind
    EXTREME: { min: 60, risk: 0.8 },               // Extreme wind
  },
  // Humidity
  humidity: {
    UNCOMFORTABLE: { min: 80, capacityReduction: 0.05 },
  },
};

/**
 * Duration thresholds (hours) — a storm lasting longer compounds risk
 * because logistics windows and workforce shifts get repeatedly disrupted,
 * not just delayed once.
 */
const STORM_DURATION_CONFIG = {
  PROLONGED_HOURS: 6, // storms lasting this long or more get flagged explicitly
  EXTENDED_HOURS: 12,
  MAX_RISK_MULTIPLIER: 0.6, // at 24h duration, risk is scaled up to 1.6x
};

function durationRiskMultiplier(stormDurationHours: number): number {
  const clamped = Math.max(0, Math.min(24, stormDurationHours));
  return 1 + (clamped / 24) * STORM_DURATION_CONFIG.MAX_RISK_MULTIPLIER;
}

/**
 * Calculate direct impacts from weather
 */
function calculateDirectImpacts(weather: NormalizedWeather, stormDurationHours = 0): DirectImpact[] {
  const impacts: DirectImpact[] = [];

  // Rainfall impact
  if (weather.rainfall > IMPACT_CONFIG.rainfall.MEDIUM.min) {
    if (weather.rainfall >= IMPACT_CONFIG.rainfall.HIGH.min) {
      impacts.push({
        type: 'HEAVY_RAINFALL',
        severity: 'HIGH',
        affectedEntities: ['ROAD_TRANSPORT', 'LOGISTICS'],
        downstreamRisks: ['DELIVERY_DELAY', 'TRANSPORT_UNAVAILABLE'],
        description: `Heavy rainfall: ${weather.rainfall.toFixed(1)}mm. Impacts road transport and logistics.`,
      });
    } else {
      impacts.push({
        type: 'MODERATE_RAINFALL',
        severity: 'MEDIUM',
        affectedEntities: ['ROAD_TRANSPORT'],
        downstreamRisks: ['DELIVERY_DELAY'],
        description: `Moderate rainfall: ${weather.rainfall.toFixed(1)}mm. May impact delivery timelines.`,
      });
    }
  }

  // Wind impact
  if (weather.windSpeed > IMPACT_CONFIG.windSpeed.MEDIUM.max) {
    if (weather.windSpeed >= IMPACT_CONFIG.windSpeed.EXTREME.min) {
      impacts.push({
        type: 'EXTREME_WIND',
        severity: 'HIGH',
        affectedEntities: ['OUTDOOR_EVENTS', 'TRANSPORT'],
        downstreamRisks: ['EVENT_CANCELLATION', 'TRANSPORT_HALTED'],
        description: `Extreme wind: ${weather.windSpeed.toFixed(1)} km/h. May force event cancellation or transport suspension.`,
      });
    } else {
      impacts.push({
        type: 'HIGH_WIND',
        severity: 'MEDIUM',
        affectedEntities: ['OUTDOOR_EVENTS'],
        downstreamRisks: ['SETUP_DIFFICULTY', 'OPERATIONAL_RISK'],
        description: `High wind: ${weather.windSpeed.toFixed(1)} km/h. May impact outdoor event setup and operation.`,
      });
    }
  }

  // Temperature extremes
  if (weather.temperature <= IMPACT_CONFIG.temperature.COLD_EXTREME.max) {
    impacts.push({
      type: 'EXTREME_COLD',
      severity: 'HIGH',
      affectedEntities: ['WORKFORCE', 'EQUIPMENT'],
      downstreamRisks: ['WORKFORCE_UNAVAILABLE', 'EQUIPMENT_MALFUNCTION'],
      description: `Extreme cold: ${weather.temperature}°C. May force workforce unavailability.`,
    });
  } else if (weather.temperature <= IMPACT_CONFIG.temperature.COLD_HIGH.max) {
    impacts.push({
      type: 'COLD_WEATHER',
      severity: 'LOW',
      affectedEntities: ['WORKFORCE'],
      downstreamRisks: ['REDUCED_PRODUCTIVITY'],
      description: `Cold weather: ${weather.temperature}°C. May reduce workforce productivity.`,
    });
  }

  if (weather.temperature >= IMPACT_CONFIG.temperature.HEAT_EXTREME.min) {
    impacts.push({
      type: 'EXTREME_HEAT',
      severity: 'HIGH',
      affectedEntities: ['WORKFORCE', 'OUTDOOR_EVENTS'],
      downstreamRisks: ['WORKFORCE_UNAVAILABLE', 'HEALTH_RISK'],
      description: `Extreme heat: ${weather.temperature}°C. May force workforce unavailability due to health risk.`,
    });
  } else if (weather.temperature >= IMPACT_CONFIG.temperature.HEAT_HIGH.min) {
    impacts.push({
      type: 'HIGH_HEAT',
      severity: 'MEDIUM',
      affectedEntities: ['WORKFORCE'],
      downstreamRisks: ['REDUCED_CAPACITY'],
      description: `High heat: ${weather.temperature}°C. May reduce workforce capacity.`,
    });
  }

  // Humidity impact
  if (weather.humidity >= IMPACT_CONFIG.humidity.UNCOMFORTABLE.min) {
    impacts.push({
      type: 'HIGH_HUMIDITY',
      severity: 'LOW',
      affectedEntities: ['WORKFORCE', 'EQUIPMENT'],
      downstreamRisks: ['REDUCED_EFFICIENCY'],
      description: `High humidity: ${weather.humidity}%. May reduce workforce efficiency.`,
    });
  }

  // Visibility impact
  if (weather.visibility && weather.visibility < 1000) {
    impacts.push({
      type: 'LOW_VISIBILITY',
      severity: 'HIGH',
      affectedEntities: ['TRANSPORT'],
      downstreamRisks: ['DELIVERY_DELAY', 'TRANSPORT_HALTED'],
      description: `Low visibility: ${weather.visibility}m. May impact transport and delivery.`,
    });
  }

  // Storm duration impact — only meaningful when there's an active weather
  // event to prolong (rain or strong wind); a long "duration" over clear
  // skies has nothing to extend.
  const hasActiveWeatherEvent = weather.rainfall > 10 || weather.windSpeed > 40;
  if (hasActiveWeatherEvent && stormDurationHours >= STORM_DURATION_CONFIG.EXTENDED_HOURS) {
    impacts.push({
      type: 'EXTENDED_STORM_DURATION',
      severity: 'HIGH',
      affectedEntities: ['LOGISTICS', 'WORKFORCE'],
      downstreamRisks: ['REPEATED_DELIVERY_DELAY', 'SHIFT_DISRUPTION'],
      description: `Extended storm duration: ${stormDurationHours}h. Repeated disruption compounds delivery and workforce risk.`,
    });
  } else if (hasActiveWeatherEvent && stormDurationHours >= STORM_DURATION_CONFIG.PROLONGED_HOURS) {
    impacts.push({
      type: 'PROLONGED_STORM_DURATION',
      severity: 'MEDIUM',
      affectedEntities: ['LOGISTICS'],
      downstreamRisks: ['REPEATED_DELIVERY_DELAY'],
      description: `Prolonged storm duration: ${stormDurationHours}h. Longer exposure increases delivery risk beyond a brief shower.`,
    });
  }

  return impacts;
}

/**
 * Calculate logistics risk based on direct impacts
 */
function calculateLogisticsRisk(
  weather: NormalizedWeather,
  stormDurationHours = 0
): { risk: 'LOW' | 'MEDIUM' | 'HIGH'; percent: number } {
  let riskPercent = 0;

  // Rainfall impact on logistics
  if (weather.rainfall >= IMPACT_CONFIG.rainfall.HIGH.min) {
    riskPercent += IMPACT_CONFIG.rainfall.HIGH.logisticsRisk * 100;
  } else if (weather.rainfall >= IMPACT_CONFIG.rainfall.MEDIUM.min) {
    riskPercent += IMPACT_CONFIG.rainfall.MEDIUM.logisticsRisk * 100;
  } else if (weather.rainfall > IMPACT_CONFIG.rainfall.LOW.max) {
    riskPercent += IMPACT_CONFIG.rainfall.LOW.logisticsRisk * 100;
  }

  // Wind impact
  if (weather.windSpeed >= IMPACT_CONFIG.windSpeed.EXTREME.min) {
    riskPercent += IMPACT_CONFIG.windSpeed.EXTREME.risk * 100;
  } else if (weather.windSpeed >= IMPACT_CONFIG.windSpeed.HIGH.max) {
    riskPercent += IMPACT_CONFIG.windSpeed.HIGH.risk * 100;
  } else if (weather.windSpeed > IMPACT_CONFIG.windSpeed.MEDIUM.max) {
    riskPercent += IMPACT_CONFIG.windSpeed.MEDIUM.risk * 100;
  }

  // Longer storms compound risk rather than just repeating it once.
  riskPercent *= durationRiskMultiplier(stormDurationHours);

  // Cap at 100
  riskPercent = Math.min(100, riskPercent);

  const risk: 'LOW' | 'MEDIUM' | 'HIGH' = riskPercent < 25 ? 'LOW' : riskPercent < 60 ? 'MEDIUM' : 'HIGH';

  return { risk, percent: Math.round(riskPercent) };
}

/**
 * Calculate workforce capacity reduction due to weather
 */
function calculateCapacityReduction(weather: NormalizedWeather): number {
  let reduction = 0;

  // Cold impact
  if (weather.temperature <= IMPACT_CONFIG.temperature.COLD_EXTREME.max) {
    reduction += IMPACT_CONFIG.temperature.COLD_EXTREME.capacityReduction;
  } else if (weather.temperature <= IMPACT_CONFIG.temperature.COLD_HIGH.max) {
    reduction += IMPACT_CONFIG.temperature.COLD_HIGH.capacityReduction;
  }

  // Heat impact
  if (weather.temperature >= IMPACT_CONFIG.temperature.HEAT_EXTREME.min) {
    reduction += IMPACT_CONFIG.temperature.HEAT_EXTREME.capacityReduction;
  } else if (weather.temperature >= IMPACT_CONFIG.temperature.HEAT_HIGH.min) {
    reduction += IMPACT_CONFIG.temperature.HEAT_HIGH.capacityReduction;
  }

  // Humidity impact
  if (weather.humidity >= IMPACT_CONFIG.humidity.UNCOMFORTABLE.min) {
    reduction += IMPACT_CONFIG.humidity.UNCOMFORTABLE.capacityReduction;
  }

  return Math.min(1, reduction); // Cap at 100% reduction
}

/**
 * Calculate cascading impacts: weather → logistics → fulfillment
 */
export function calculateProviderImpacts(
  weather: NormalizedWeather,
  providers: ProviderInput[],
  stormDurationHours = 0
): ProviderImpact[] {
  const directImpacts = calculateDirectImpacts(weather, stormDurationHours);
  const logisticsRisk = calculateLogisticsRisk(weather, stormDurationHours);
  const capacityReduction = calculateCapacityReduction(weather);

  return providers.map((provider) => {
    // Cascading impact chain:
    // Weather → Logistics Risk → Provider Delivery Risk
    const logisticsToFulfillmentRisk = logisticsRisk.percent / 100;
    const capacityImpact = capacityReduction;

    // Combined risk on this provider's fulfillment
    const totalFulfillmentRisk = Math.min(1, logisticsToFulfillmentRisk + capacityImpact);
    const projectedFulfillment = Math.round(provider.quantity * (1 - totalFulfillmentRisk));

    return {
      providerId: provider.providerId,
      providerName: provider.name,
      quantity: provider.quantity,
      baselineFulfillment: provider.quantity,
      logisticsRisk: logisticsRisk.risk,
      logisticsRiskPercent: logisticsRisk.percent,
      projectedFulfillment,
      impacts: directImpacts,
      latitude: provider.latitude,
      longitude: provider.longitude,
    };
  });
}

/**
 * Calculate total requirement fulfillment under simulated weather
 */
export function calculateRequirementFulfillment(
  totalRequired: number,
  providers: ProviderInput[],
  weather: NormalizedWeather,
  stormDurationHours = 0
): {
  baselineFulfillment: number;
  projectedFulfillment: number;
  unitsAtRisk: number;
  fulfillmentPercent: number;
  fulfillmentRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  providerImpacts: ProviderImpact[];
} {
  const providerImpacts = calculateProviderImpacts(weather, providers, stormDurationHours);

  const baselineFulfillment = providers.reduce((sum, p) => sum + p.quantity, 0);
  const projectedFulfillment = providerImpacts.reduce((sum, p) => sum + p.projectedFulfillment, 0);
  const unitsAtRisk = baselineFulfillment - projectedFulfillment;
  const fulfillmentPercent = Math.round((projectedFulfillment / Math.max(1, totalRequired)) * 100);

  const fulfillmentRisk: 'LOW' | 'MEDIUM' | 'HIGH' =
    fulfillmentPercent >= 100 ? 'LOW' : fulfillmentPercent >= 75 ? 'MEDIUM' : 'HIGH';

  return {
    baselineFulfillment,
    projectedFulfillment,
    unitsAtRisk,
    fulfillmentPercent,
    fulfillmentRisk,
    providerImpacts,
  };
}

/**
 * Generate human-readable impact chain explanation
 */
export function explainImpactChain(weather: NormalizedWeather, providerImpact: ProviderImpact): string {
  const lines: string[] = [];

  lines.push(`**Weather Event**: ${weather.weatherCondition} conditions`);

  if (weather.rainfall > 10) {
    lines.push(`  → Heavy rainfall (${weather.rainfall.toFixed(1)}mm)`);
    lines.push(`    → Road/transport risk increased`);
    lines.push(`    → Delivery delays likely`);
  }

  if (weather.windSpeed > 40) {
    lines.push(`  → Strong winds (${weather.windSpeed.toFixed(1)} km/h)`);
    lines.push(`    → Transport suspended or delayed`);
  }

  if (weather.temperature > 45 || weather.temperature < 0) {
    lines.push(`  → Extreme temperature (${weather.temperature}°C)`);
    lines.push(`    → Workforce availability reduced`);
    lines.push(`    → Service capacity reduced`);
  }

  lines.push(`\n**Cascading Impact on ${providerImpact.providerName}**:`);
  lines.push(`  Logistics Risk: ${providerImpact.logisticsRisk} (${providerImpact.logisticsRiskPercent}%)`);
  lines.push(`  Projected Fulfillment: ${providerImpact.projectedFulfillment} / ${providerImpact.baselineFulfillment} units`);
  if (providerImpact.baselineFulfillment - providerImpact.projectedFulfillment > 0) {
    lines.push(`  ⚠️ ${providerImpact.baselineFulfillment - providerImpact.projectedFulfillment} units at risk`);
  }

  return lines.join('\n');
}
