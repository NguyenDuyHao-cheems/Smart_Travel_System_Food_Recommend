import { useState, useEffect, useRef } from 'react';

/* ──────────────────────────────────────────────
   Weather data types
────────────────────────────────────────────── */
export interface WeatherInfo {
  isRaining: boolean;
  rainMm: number;           // mm of rain (0 if none)
  weatherCode: number;      // WMO weather code
  description: string;      // human-readable Vietnamese description
  source: 'openweathermap' | 'open-meteo';
}

type WeatherMap = Record<string, WeatherInfo>;

/* ──────────────────────────────────────────────
   WMO Weather Code → Vietnamese description
────────────────────────────────────────────── */
function wmoDescription(code: number): string {
  if (code <= 3) return 'Trời quang';
  if (code <= 48) return 'Có sương mù';
  if (code <= 57) return 'Mưa phùn';
  if (code <= 67) return 'Mưa';
  if (code <= 77) return 'Mưa tuyết';
  if (code <= 82) return 'Mưa rào';
  if (code <= 86) return 'Mưa tuyết rào';
  if (code <= 99) return 'Giông bão';
  return 'Không rõ';
}

function isRainCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
}

/* ──────────────────────────────────────────────
   In-memory cache with TTL
────────────────────────────────────────────── */
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const weatherCache = new Map<string, { data: WeatherInfo; timestamp: number }>();

function cacheKey(lat: number, lng: number): string {
  // Round to 2 decimals to group nearby coordinates
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function getCached(lat: number, lng: number): WeatherInfo | null {
  const key = cacheKey(lat, lng);
  const entry = weatherCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  weatherCache.delete(key);
  return null;
}

function setCache(lat: number, lng: number, data: WeatherInfo): void {
  weatherCache.set(cacheKey(lat, lng), { data, timestamp: Date.now() });
}

/* ──────────────────────────────────────────────
   OpenWeatherMap API (primary)
────────────────────────────────────────────── */
const OWM_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '';

async function fetchOpenWeatherMap(lat: number, lng: number): Promise<WeatherInfo> {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OWM_API_KEY}&units=metric&lang=vi`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`OWM status ${res.status}`);
  const data = await res.json();

  const mainWeather = data.weather?.[0]?.main ?? '';
  const rainMm = data.rain?.['1h'] ?? data.rain?.['3h'] ?? 0;
  const isRaining = mainWeather === 'Rain' || mainWeather === 'Drizzle' || mainWeather === 'Thunderstorm' || rainMm > 0;
  // Map OWM condition id to WMO code approximately
  const owmId = data.weather?.[0]?.id ?? 0;
  let weatherCode = 0;
  if (owmId >= 200 && owmId < 300) weatherCode = 95; // Thunderstorm
  else if (owmId >= 300 && owmId < 400) weatherCode = 53; // Drizzle
  else if (owmId >= 500 && owmId < 600) weatherCode = 61; // Rain
  else if (owmId >= 600 && owmId < 700) weatherCode = 71; // Snow
  else if (owmId >= 700 && owmId < 800) weatherCode = 45; // Atmosphere/fog
  else if (owmId === 800) weatherCode = 0;  // Clear
  else if (owmId > 800) weatherCode = 3;    // Clouds

  const description = data.weather?.[0]?.description ?? wmoDescription(weatherCode);

  return {
    isRaining,
    rainMm,
    weatherCode,
    description: description.charAt(0).toUpperCase() + description.slice(1),
    source: 'openweathermap',
  };
}

/* ──────────────────────────────────────────────
   Open-Meteo API (fallback)
────────────────────────────────────────────── */
async function fetchOpenMeteo(lat: number, lng: number): Promise<WeatherInfo> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=rain,weather_code`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Open-Meteo status ${res.status}`);
  const data = await res.json();

  const rainMm = data.current?.rain ?? 0;
  const weatherCode = data.current?.weather_code ?? 0;
  const isRaining = rainMm > 0 || isRainCode(weatherCode);

  return {
    isRaining,
    rainMm,
    weatherCode,
    description: wmoDescription(weatherCode),
    source: 'open-meteo',
  };
}

/* ──────────────────────────────────────────────
   Fetch with fallback
────────────────────────────────────────────── */
async function fetchWeather(lat: number, lng: number): Promise<WeatherInfo> {
  // Check cache first
  const cached = getCached(lat, lng);
  if (cached) return cached;

  let result: WeatherInfo;
  try {
    result = await fetchOpenWeatherMap(lat, lng);
  } catch {
    // Fallback to Open-Meteo
    result = await fetchOpenMeteo(lat, lng);
  }

  setCache(lat, lng, result);
  return result;
}

/* ──────────────────────────────────────────────
   React Hook
────────────────────────────────────────────── */
interface Coordinate {
  id: string;
  lat?: number;
  lng?: number;
}

export function useWeather(coords: Coordinate[]): {
  weatherMap: WeatherMap;
  loading: boolean;
  error: string | null;
} {
  const [weatherMap, setWeatherMap] = useState<WeatherMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const validCoords = coords.filter((c) => c.lat && c.lng);
    if (validCoords.length === 0) {
      setWeatherMap({});
      setLoading(false);
      return;
    }

    // Build a stable key to avoid refetching on same set
    const coordKey = validCoords.map((c) => `${c.id}:${c.lat}:${c.lng}`).join('|');

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const results: WeatherMap = {};
        // Fetch in parallel with concurrency limit of 3
        const chunks: Coordinate[][] = [];
        for (let i = 0; i < validCoords.length; i += 3) {
          chunks.push(validCoords.slice(i, i + 3));
        }

        for (const chunk of chunks) {
          if (cancelled) return;
          const promises = chunk.map(async (c) => {
            const weather = await fetchWeather(c.lat!, c.lng!);
            return { id: c.id, weather };
          });
          const settled = await Promise.allSettled(promises);
          for (const result of settled) {
            if (result.status === 'fulfilled') {
              results[result.value.id] = result.value.weather;
            }
          }
        }

        if (!cancelled) {
          setWeatherMap(results);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Không thể tải dữ liệu thời tiết');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.map((c) => `${c.id}:${c.lat}:${c.lng}`).join('|')]);

  return { weatherMap, loading, error };
}
