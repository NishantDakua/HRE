/**
 * Weather Service
 *
 * Abstract weather provider for Digital Twin simulation.
 * Normalizes weather data from any provider into a common structure.
 */

export interface NormalizedWeather {
  location: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  temperature: number; // Celsius
  humidity: number; // 0-100
  rainfall: number; // mm (current/1h)
  precipitationProbability: number; // 0-100
  windSpeed: number; // km/h
  windGust?: number; // km/h
  weatherCondition: string; // "clear", "cloudy", "rainy", "stormy", etc.
  visibility?: number; // meters
  cloudCover?: number; // 0-100
  alerts?: string[];
  source: string; // "openweather", "mock", etc.
}

export interface WeatherForecast {
  location: string;
  timestamp: Date;
  forecasts: Array<{
    timestamp: Date;
    temperature: number;
    humidity: number;
    rainfall: number;
    precipitationProbability: number;
    windSpeed: number;
    weatherCondition: string;
  }>;
}

export interface IWeatherProvider {
  getCurrentWeather(lat: number, lng: number, locationName?: string): Promise<NormalizedWeather>;
  getWeatherForecast(lat: number, lng: number, days: number, locationName?: string): Promise<WeatherForecast>;
}

/**
 * OpenWeather API provider
 * Free tier: https://openweathermap.org/api
 */
class OpenWeatherProvider implements IWeatherProvider {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('OpenWeather API key required');
    this.apiKey = apiKey;
  }

  async getCurrentWeather(lat: number, lng: number, locationName = 'Unknown'): Promise<NormalizedWeather> {
    const url = `${this.baseUrl}/weather?lat=${lat}&lon=${lng}&appid=${this.apiKey}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenWeather API error: ${res.statusText}`);

    const data = (await res.json()) as {
      main: { temp: number; humidity: number };
      weather: Array<{ main: string; description: string }>;
      wind: { speed: number; gust?: number };
      clouds: { all: number };
      rain?: { '1h': number };
      visibility?: number;
      name: string;
      coord: { lat: number; lon: number };
    };

    const rainfall = data.rain?.['1h'] ?? 0;
    const condition = this.normalizeCondition(data.weather[0]?.main ?? 'unknown');

    return {
      location: data.name || locationName,
      latitude: data.coord.lat,
      longitude: data.coord.lon,
      timestamp: new Date(),
      temperature: data.main.temp,
      humidity: data.main.humidity,
      rainfall,
      precipitationProbability: rainfall > 0 ? Math.min(100, rainfall * 10) : 0,
      windSpeed: data.wind.speed * 3.6, // m/s to km/h
      windGust: data.wind.gust ? data.wind.gust * 3.6 : undefined,
      weatherCondition: condition,
      visibility: data.visibility,
      cloudCover: data.clouds.all,
      source: 'openweather',
    };
  }

  async getWeatherForecast(lat: number, lng: number, days: number, locationName = 'Unknown'): Promise<WeatherForecast> {
    const url = `${this.baseUrl}/forecast?lat=${lat}&lon=${lng}&appid=${this.apiKey}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenWeather API error: ${res.statusText}`);

    const data = (await res.json()) as {
      list: Array<{
        dt: number;
        main: { temp: number; humidity: number };
        weather: Array<{ main: string }>;
        wind: { speed: number };
        rain?: { '3h': number };
        clouds: { all: number };
      }>;
      city: { name: string; coord: { lat: number; lon: number } };
    };

    const forecasts = data.list
      .slice(0, Math.ceil((days * 24) / 3)) // 3-hour intervals
      .map((item) => ({
        timestamp: new Date(item.dt * 1000),
        temperature: item.main.temp,
        humidity: item.main.humidity,
        rainfall: (item.rain?.['3h'] ?? 0) / 3, // Convert 3h to 1h average
        precipitationProbability: (item.rain?.['3h'] ?? 0) > 0 ? Math.min(100, (item.rain?.['3h'] ?? 0) * 10) : 0,
        windSpeed: item.wind.speed * 3.6,
        weatherCondition: this.normalizeCondition(item.weather[0]?.main ?? 'unknown'),
      }));

    return {
      location: data.city.name || locationName,
      timestamp: new Date(),
      forecasts,
    };
  }

  private normalizeCondition(condition: string): string {
    const lower = condition.toLowerCase();
    if (lower.includes('clear') || lower.includes('sunny')) return 'clear';
    if (lower.includes('cloud')) return 'cloudy';
    if (lower.includes('rain')) return 'rainy';
    if (lower.includes('storm') || lower.includes('thunder')) return 'stormy';
    if (lower.includes('snow')) return 'snowy';
    if (lower.includes('mist') || lower.includes('fog')) return 'foggy';
    return lower;
  }
}

/**
 * Mock weather provider for development/testing
 */
class MockWeatherProvider implements IWeatherProvider {
  async getCurrentWeather(lat: number, lng: number, locationName = 'Test Location'): Promise<NormalizedWeather> {
    return {
      location: locationName,
      latitude: lat,
      longitude: lng,
      timestamp: new Date(),
      temperature: 28,
      humidity: 65,
      rainfall: 0,
      precipitationProbability: 0,
      windSpeed: 12,
      weatherCondition: 'clear',
      cloudCover: 20,
      visibility: 10000,
      source: 'mock',
    };
  }

  async getWeatherForecast(lat: number, lng: number, days: number, locationName = 'Test Location'): Promise<WeatherForecast> {
    const forecasts = Array.from({ length: days * 8 }).map((_, i) => ({
      timestamp: new Date(Date.now() + i * 3 * 60 * 60 * 1000),
      temperature: 28 - Math.sin(i / 4) * 5,
      humidity: 65,
      rainfall: i % 3 === 0 ? 5 : 0,
      precipitationProbability: i % 3 === 0 ? 40 : 0,
      windSpeed: 12 + Math.sin(i / 3) * 5,
      weatherCondition: i % 3 === 0 ? 'rainy' : 'clear',
    }));

    return {
      location: locationName,
      timestamp: new Date(),
      forecasts,
    };
  }
}

/**
 * Factory function to create weather provider
 */
export function createWeatherProvider(provider: 'openweather' | 'mock' = 'mock'): IWeatherProvider {
  if (provider === 'openweather') {
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) throw new Error('WEATHER_API_KEY environment variable not set');
    return new OpenWeatherProvider(apiKey);
  }
  return new MockWeatherProvider();
}

/**
 * Singleton instance
 */
let instance: IWeatherProvider | null = null;

export function getWeatherProvider(): IWeatherProvider {
  if (!instance) {
    const providerType = (process.env.WEATHER_PROVIDER as 'openweather' | 'mock') ?? 'mock';
    instance = createWeatherProvider(providerType);
  }
  return instance;
}

/**
 * Convenience functions
 */
export async function getCurrentWeather(lat: number, lng: number, locationName?: string): Promise<NormalizedWeather> {
  return getWeatherProvider().getCurrentWeather(lat, lng, locationName);
}

export async function getWeatherForecast(lat: number, lng: number, days: number, locationName?: string): Promise<WeatherForecast> {
  return getWeatherProvider().getWeatherForecast(lat, lng, days, locationName);
}
