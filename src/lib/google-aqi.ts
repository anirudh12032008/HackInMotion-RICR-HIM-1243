import axios from "axios";
import { Pollutants } from "@/types/index";

const API_KEY = process.env.GOOGLE_API_KEY;
const AQ_BASE = "https://airquality.googleapis.com/v1";
const GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";

export class GoogleAqiError extends Error {}

function assertKey() {
  if (!API_KEY) throw new GoogleAqiError("Missing GOOGLE_API_KEY environment variable");
}

export interface GeocodedPlace {
  name: string;
  lat: number;
  lng: number;
}

export async function geocodeCity(query: string): Promise<GeocodedPlace> {
  assertKey();
  const { data } = await axios.get(GEOCODE_BASE, {
    params: { address: query, key: API_KEY },
  });
  if (data.status !== "OK" || !data.results?.length) {
    throw new GoogleAqiError(`Couldn't find "${query}"`);
  }
  const result = data.results[0];
  return {
    name: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
  };
}

export async function searchPlaces(query: string): Promise<GeocodedPlace[]> {
  assertKey();
  const { data } = await axios.get(GEOCODE_BASE, {
    params: { address: query, key: API_KEY },
  });
  if (data.status !== "OK") return [];
  return data.results.map((r: { formatted_address: string; geometry: { location: { lat: number; lng: number } } }) => ({
    name: r.formatted_address,
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
  }));
}

// Google's index codes -> our Pollutants keys, when concentration data is present.
const POLLUTANT_CODE_MAP: Record<string, keyof Pollutants> = {
  pm25: "pm25",
  pm10: "pm10",
  o3: "o3",
  no2: "no2",
  so2: "so2",
  co: "co",
};

interface AqIndex {
  code: string;
  aqi: number;
  category: string;
  dominantPollutant: string;
}

interface AqPollutant {
  code: string;
  concentration?: { value: number; units: string };
}

export interface CurrentConditions {
  aqi: number;
  category: string;
  dominantPollutant: string;
  pollutants: Pollutants;
  timestamp: string;
}

/**
 * ponytail: prefers the "usa_epa" 0-500 index (matches risk-engine.ts bands).
 * Locations outside Google's regional-index coverage only get "uaqi" (0-100)
 * back, which we pass through as-is rather than converting scales — good
 * enough for a hackathon demo, not scientifically equivalent.
 */
export async function getCurrentConditions(lat: number, lng: number): Promise<CurrentConditions> {
  assertKey();
  const { data } = await axios.post(
    `${AQ_BASE}/currentConditions:lookup`,
    {
      location: { latitude: lat, longitude: lng },
      extraComputations: [
        "HEALTH_RECOMMENDATIONS",
        "POLLUTANT_CONCENTRATION",
        "LOCAL_AQI",
        "DOMINANT_POLLUTANT_CONCENTRATION",
      ],
      languageCode: "en",
    },
    { params: { key: API_KEY } }
  );

  const indexes: AqIndex[] = data.indexes ?? [];
  if (indexes.length === 0) {
    throw new GoogleAqiError("No air quality station near this location");
  }
  const primary = indexes.find((i) => i.code === "usa_epa") ?? indexes[0];

  const pollutants: Pollutants = {};
  for (const p of (data.pollutants ?? []) as AqPollutant[]) {
    const key = POLLUTANT_CODE_MAP[p.code];
    if (key && p.concentration) pollutants[key] = Math.round(p.concentration.value);
  }

  return {
    aqi: primary.aqi,
    category: primary.category,
    dominantPollutant: primary.dominantPollutant,
    pollutants,
    timestamp: data.dateTime ?? new Date().toISOString(),
  };
}

export interface HourlyForecast {
  dateTime: string;
  aqi: number;
}

export async function getHourlyForecast(lat: number, lng: number): Promise<HourlyForecast[]> {
  assertKey();
  const { data } = await axios.post(
    `${AQ_BASE}/forecast:lookup`,
    {
      location: { latitude: lat, longitude: lng },
      period: {
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      extraComputations: ["LOCAL_AQI"],
      languageCode: "en",
    },
    { params: { key: API_KEY } }
  );

  const hours = (data.hourlyForecasts ?? []) as {
    dateTime: string;
    indexes: AqIndex[];
  }[];

  return hours
    .map((h) => {
      const idx = h.indexes.find((i) => i.code === "usa_epa") ?? h.indexes[0];
      return idx ? { dateTime: h.dateTime, aqi: idx.aqi } : null;
    })
    .filter((h): h is HourlyForecast => h !== null);
}

/** Groups hourly forecast points into WAQI-shaped {day, avg, min, max} entries. */
export function groupForecastByDay(hourly: HourlyForecast[]) {
  const byDay = new Map<string, number[]>();
  for (const h of hourly) {
    const day = h.dateTime.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(h.aqi);
  }

  return Array.from(byDay.entries()).map(([day, values]) => ({
    day,
    avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    min: Math.min(...values),
    max: Math.max(...values),
  }));
}

/** Google's official AQI heatmap tile URL for a given map style — proxied server-side via /api/aqi/heatmap-tile to keep the API key off the client. */
export function heatmapTileUrl(mapType: string, z: number, x: number, y: number) {
  return `${AQ_BASE}/mapTypes/${mapType}/heatmapTiles/${z}/${x}/${y}?key=${API_KEY}`;
}
