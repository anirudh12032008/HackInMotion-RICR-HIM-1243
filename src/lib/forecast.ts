import { classifyRisk } from "@/lib/risk-engine";

export interface ForecastDay {
  date: string;
  avg: number;
  min: number;
  max: number;
}

/**
 * `/api/aqi/current` groups Google's hourly AQI forecast into a
 * `{daily:{pm25:[...]}}` shape (see groupForecastByDay in lib/google-aqi.ts)
 * for backward compatibility with this original WAQI-shaped extractor.
 */
export function extractDailyForecast(
  daily: Record<string, { avg: number; day: string; max: number; min: number }[]> | null | undefined
): ForecastDay[] {
  const pm25 = daily?.pm25 ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return pm25
    .filter((d) => d.day >= today)
    .slice(0, 5)
    .map((d) => ({ date: d.day, avg: d.avg, min: d.min, max: d.max }));
}

export function getBestDay(days: ForecastDay[]) {
  if (days.length === 0) return null;
  return days.reduce((best, day) => (day.avg < best.avg ? day : best), days[0]);
}

export function hasUnhealthyDay(days: ForecastDay[]) {
  return days.some((d) => classifyRisk(d.avg).level !== "good" && classifyRisk(d.avg).level !== "moderate");
}
