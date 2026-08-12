import axios from "axios";

const WAQI_BASE = "https://api.waqi.info";
const TOKEN = process.env.WAQI_API_TOKEN;

export interface WaqiSearchResult {
  uid: number;
  aqi: string;
  station: { name: string; geo: [number, number]; url: string };
  time: { tz: string; stime: string; vtime: number };
}

export interface WaqiFeedData {
  aqi: number;
  idx: number;
  dominentpol: string;
  city: { name: string; geo: [number, number]; url: string };
  time: { s: string; tz: string; v: number };
  iaqi: Record<string, { v: number }>;
  forecast?: {
    daily: Record<string, { avg: number; day: string; max: number; min: number }[]>;
  };
  attributions?: { url: string; name: string }[];
}

class WaqiError extends Error {}

function assertToken() {
  if (!TOKEN) {
    throw new WaqiError("Missing WAQI_API_TOKEN environment variable");
  }
}

export async function searchCity(query: string): Promise<WaqiSearchResult[]> {
  assertToken();
  const { data } = await axios.get(`${WAQI_BASE}/search/`, {
    params: { keyword: query, token: TOKEN },
  });
  if (data.status !== "ok") throw new WaqiError(data.data ?? "WAQI search failed");
  return data.data as WaqiSearchResult[];
}

export async function getCurrentAQI(city: string): Promise<WaqiFeedData> {
  assertToken();
  const { data } = await axios.get(`${WAQI_BASE}/feed/${encodeURIComponent(city)}/`, {
    params: { token: TOKEN },
  });
  if (data.status !== "ok") throw new WaqiError(data.data ?? "City not found");
  return data.data as WaqiFeedData;
}

export async function getCurrentAQIByCoords(lat: number, lng: number): Promise<WaqiFeedData> {
  assertToken();
  const { data } = await axios.get(`${WAQI_BASE}/feed/geo:${lat};${lng}/`, {
    params: { token: TOKEN },
  });
  if (data.status !== "ok") throw new WaqiError(data.data ?? "No station near this location");
  return data.data as WaqiFeedData;
}

export async function getForecast(city: string) {
  const feed = await getCurrentAQI(city);
  return feed.forecast?.daily ?? {};
}

export function extractPollutants(iaqi: WaqiFeedData["iaqi"]) {
  return {
    pm25: iaqi.pm25?.v,
    pm10: iaqi.pm10?.v,
    o3: iaqi.o3?.v,
    no2: iaqi.no2?.v,
    so2: iaqi.so2?.v,
    co: iaqi.co?.v,
  };
}

export { WaqiError };
