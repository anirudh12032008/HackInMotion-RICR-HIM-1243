import { classifyRisk } from "@/lib/risk-engine";

export interface ForecastDay {
  date: string;
  avg: number;
  min: number;
  max: number;
}

/**
 * WAQI's forecast.daily is keyed by pollutant (pm25, pm10, o3, ...). PM2.5 is
 * the most commonly dominant pollutant, so it doubles as an AQI proxy here.
 * ponytail: pm25-as-AQI proxy, swap for a proper multi-pollutant max if a future
 * feature needs per-pollutant forecast accuracy.
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
