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

/** Turns lat/lng (from geolocation or a map click) into a human-readable place name. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  assertKey();
  const { data } = await axios.get(GEOCODE_BASE, {
    params: { latlng: `${lat},${lng}`, key: API_KEY },
  });
  if (data.status !== "OK" || !data.results?.length) return null;

  // Prefer a locality/city-level result over the more specific street address.
  const localityResult = data.results.find((r: { types: string[] }) =>
    r.types.includes("locality")
  );
  return (localityResult ?? data.results[0]).formatted_address;
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

export interface HealthRecommendations {
  generalPopulation?: string;
  elderly?: string;
  lungDiseasePopulation?: string;
  heartDiseasePopulation?: string;
  athletes?: string;
  pregnantWomen?: string;
  children?: string;
}

export interface CurrentConditions {
  aqi: number;
  category: string;
  dominantPollutant: string;
  pollutants: Pollutants;
  timestamp: string;
  scale: "regional" | "universal";
  healthRecommendations?: HealthRecommendations;
}

/**
 * Google always returns "uaqi" (Universal AQI, 0-100, HIGHER = better air —
 * inverted from every other scale in this app) alongside a country-specific
 * regional index when one exists for the location (e.g. "usa_epa" for the
 * US, "ind_cpcb" for India — both 0-500, higher = worse, matching
 * risk-engine.ts's bands). We must prefer the regional index by name, not
 * assume it's first in the array — picking anything other than "uaqi" here
 * is what avoids silently classifying good air as hazardous or vice versa.
 * Locations with no regional coverage fall back to uaqi and are flagged via
 * `scale: "universal"` so callers can avoid running it through classifyRisk().
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
  const primary = pickIndex(indexes);

  const pollutants: Pollutants = {};
  for (const p of (data.pollutants ?? []) as AqPollutant[]) {
    const key = POLLUTANT_CODE_MAP[p.code];
    if (key && p.concentration) pollutants[key] = Math.round(p.concentration.value);
  }

  return {
    aqi: primary.index.aqi,
    category: primary.index.category,
    dominantPollutant: primary.index.dominantPollutant,
    pollutants,
    timestamp: data.dateTime ?? new Date().toISOString(),
    scale: primary.scale,
    healthRecommendations: data.healthRecommendations,
  };
}

/** Picks the country-specific regional index over Universal AQI whenever one is present. */
function pickIndex(indexes: AqIndex[]): { index: AqIndex; scale: "regional" | "universal" } {
  const regional = indexes.find((i) => i.code !== "uaqi");
  if (regional) return { index: regional, scale: "regional" };
  return { index: indexes[0], scale: "universal" };
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
        // 95h, not a full 96h — Google's API rejects periods right at its
        // documented max, so this stays safely under the boundary.
        endTime: new Date(Date.now() + 95 * 60 * 60 * 1000).toISOString(),
      },
      pageSize: 100,
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
      if (h.indexes.length === 0) return null;
      const { index } = pickIndex(h.indexes);
      return { dateTime: h.dateTime, aqi: index.aqi };
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
