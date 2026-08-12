import axios from "axios";

const API_KEY = process.env.GOOGLE_API_KEY;
const POLLEN_BASE = "https://pollen.googleapis.com/v1/forecast:lookup";

export class GooglePollenError extends Error {}

export interface PollenTypeInfo {
  code: string;
  displayName: string;
  indexValue: number;
  category: string;
  color: string;
}

interface RawPollenType {
  code: string;
  displayName: string;
  indexInfo?: {
    value: number;
    category: string;
    color?: { red?: number; green?: number; blue?: number };
  };
}

export async function getPollenForecast(lat: number, lng: number): Promise<PollenTypeInfo[]> {
  if (!API_KEY) throw new GooglePollenError("Missing GOOGLE_API_KEY environment variable");

  const { data } = await axios.get(POLLEN_BASE, {
    params: {
      key: API_KEY,
      "location.latitude": lat,
      "location.longitude": lng,
      days: 1,
    },
  });

  const today = data.dailyInfo?.[0];
  const types: RawPollenType[] = today?.pollenTypeInfo ?? [];

  return types
    .filter((t) => t.indexInfo)
    .map((t) => ({
      code: t.code,
      displayName: t.displayName,
      indexValue: t.indexInfo!.value,
      category: t.indexInfo!.category,
      color: rgbToHex(t.indexInfo!.color),
    }));
}

function rgbToHex(color?: { red?: number; green?: number; blue?: number }): string {
  if (!color) return "#6b7280";
  const toByte = (v?: number) => Math.round((v ?? 0) * 255);
  return `#${[toByte(color.red), toByte(color.green), toByte(color.blue)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}
