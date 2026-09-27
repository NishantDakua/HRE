import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Weather {
  location: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  precipitationProbability: number;
  windSpeed: number;
  windGust?: number;
  weatherCondition: string;
  visibility?: number;
  cloudCover?: number;
  source: string;
  dataType: string;
}

export function useCurrentWeather(latitude: number, longitude: number, location?: string) {
  return useQuery({
    queryKey: ['weather', 'current', latitude, longitude],
    queryFn: async () => {
      const { data } = await api.get<Weather>('/digital-twin/weather/current', {
        params: { latitude, longitude, location },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export interface WeatherForecast {
  location: string;
  timestamp: string;
  forecasts: Array<{
    timestamp: string;
    temperature: number;
    humidity: number;
    rainfall: number;
    precipitationProbability: number;
    windSpeed: number;
    weatherCondition: string;
  }>;
  dataType: string;
  source: string;
}

export function useWeatherForecast(latitude: number, longitude: number, days = 3) {
  return useQuery({
    queryKey: ['weather', 'forecast', latitude, longitude, days],
    queryFn: async () => {
      const { data } = await api.get<WeatherForecast>('/digital-twin/weather/forecast', {
        params: { latitude, longitude, days },
      });
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });
}
