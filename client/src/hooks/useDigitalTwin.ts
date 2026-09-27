import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SimulationInput {
  requirementId: string;
  rainfall: number;
  stormDuration: number;
  temperature: number;
  windSpeed: number;
  location?: string;
  latitude?: number;
  longitude?: number;
}

export interface AffectedProvider {
  providerId: string;
  providerName: string;
  logisticsRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  projectedFulfillment: number;
  baselineFulfillment: number;
  latitude?: number;
  longitude?: number;
}

export interface EventLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export interface SimulationOutput {
  scenarioId: string;
  simulationId: string;
  baselineFulfillmentPercent: number;
  projectedFulfillmentPercent: number;
  unitsAtRisk: number;
  fulfillmentRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  eventLocation: EventLocation;
  affectedProviders: AffectedProvider[];
  impacts: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  dataType: string;
  note: string;
}

export function useRunSimulation() {
  return useMutation({
    mutationFn: async (input: SimulationInput) => {
      const { data } = await api.post<{ simulation: SimulationOutput; dataType: string; note: string }>('/digital-twin/simulate', input);
      return data.simulation;
    },
  });
}

export function useSimulationResult(resultId: string | null) {
  return useQuery({
    queryKey: ['simulation', 'result', resultId],
    queryFn: async () => {
      if (!resultId) return null;
      const { data } = await api.get(`/digital-twin/simulations/${resultId}`);
      return data.result;
    },
    enabled: !!resultId,
  });
}

export function useMySimulations() {
  return useQuery({
    queryKey: ['simulation', 'my-simulations'],
    queryFn: async () => {
      const { data } = await api.get('/digital-twin/my-simulations');
      return data.simulations;
    },
  });
}
