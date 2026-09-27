import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SocialSignal {
  id: string;
  location: string;
  timestamp: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  source: string;
  url?: string;
  label: 'LIVE PUBLIC SIGNAL' | 'DEMO PUBLIC SIGNAL';
}

export function useSocialSignals(location: string, weatherCondition: string) {
  return useQuery({
    queryKey: ['social-signals', location, weatherCondition],
    queryFn: async () => {
      const { data } = await api.get<{ dataType: string; source: 'live' | 'demo'; signals: SocialSignal[]; note: string }>(
        '/digital-twin/social-signals',
        { params: { location, weatherCondition } }
      );
      return data;
    },
    staleTime: 10 * 60 * 1000, // news doesn't change second-to-second
    retry: 1,
  });
}
