import { classifyRisk } from "@/lib/risk-engine";
import type { UserHealthProfile } from "@/types/index";

/**
 * Google's forecast endpoint returns 48 hourly points, but the rest of the app
 * collapses them straight into daily min/avg/max (see lib/forecast.ts). That
 * throws away the most actionable signal in the whole payload: air quality
 * swings by two or three risk bands within a single day, so "don't go outside
 * today" is usually wrong — "go outside between 6am and 9am" is right.
 *
 * This module recovers that: it finds contiguous runs of hours that are safe
 * for a *specific* person and ranks them.
 */

export interface HourPoint {
  dateTime: string;
  aqi: number;
}

export interface CleanAirWindow {
  start: string;
  end: string;
  /** Whole hours the window covers. */
  hours: number;
  peakAqi: number;
  averageAqi: number;
  label: string;
}

/**
 * The AQI ceiling a person can treat as "fine to be outside".
 *
 * Vulnerable users get the EPA's sensitive-group cutoff (100), which is
 * literally defined as the point where they start reacting while the general
 * public does not. Athletes and active users get the same cutoff for a
 * different reason: heavy exertion multiplies inhaled dose enough that
 * moderate air behaves like unhealthy air for them (see lib/exposure.ts).
 */
export function safeAqiCeiling(profile: UserHealthProfile): number {
  const vulnerable =
    profile.conditions.length > 0 || profile.ageGroup === "child" || profile.ageGroup === "senior";
  if (vulnerable) return 100;
  if (profile.activityLevel === "athlete" || profile.activityLevel === "active") return 100;
  return 150;
}

/** Contiguous runs of forecast hours at or below `ceiling`, cleanest first. */
export function findCleanAirWindows(
  hourly: HourPoint[],
  ceiling: number,
  { minHours = 2, limit = 3 }: { minHours?: number; limit?: number } = {}
): CleanAirWindow[] {
  const sorted = [...hourly].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  const runs: HourPoint[][] = [];
  let current: HourPoint[] = [];

  for (const point of sorted) {
    if (point.aqi <= ceiling) {
      current.push(point);
    } else if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length > 0) runs.push(current);

  return runs
    .filter((run) => run.length >= minHours)
    .map(toWindow)
    .sort((a, b) => a.averageAqi - b.averageAqi || b.hours - a.hours)
    .slice(0, limit);
}

function toWindow(run: HourPoint[]): CleanAirWindow {
  const values = run.map((p) => p.aqi);
  const start = run[0].dateTime;
  // Each point represents the hour that *begins* at its timestamp, so the
  // window actually runs until an hour past the last point.
  const end = new Date(new Date(run[run.length - 1].dateTime).getTime() + 3600_000).toISOString();

  return {
    start,
    end,
    hours: run.length,
    peakAqi: Math.max(...values),
    averageAqi: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    label: describeWindow(start, end),
  };
}

function describeWindow(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", hour12: true });
  const now = new Date();

  const dayLabel =
    startDate.toDateString() === now.toDateString()
      ? "Today"
      : startDate.toDateString() === new Date(now.getTime() + 86_400_000).toDateString()
        ? "Tomorrow"
        : startDate.toLocaleDateString(undefined, { weekday: "long" });

  return `${dayLabel}, ${time(startDate)} – ${time(endDate)}`;
}

export interface PeakHour {
  dateTime: string;
  aqi: number;
  label: string;
}

/** The single worst forecast hour — what a forward-looking alert should warn about. */
export function worstHour(hourly: HourPoint[]): PeakHour | null {
  if (hourly.length === 0) return null;
  const worst = hourly.reduce((a, b) => (b.aqi > a.aqi ? b : a), hourly[0]);
  return {
    dateTime: worst.dateTime,
    aqi: worst.aqi,
    label: new Date(worst.dateTime).toLocaleString(undefined, {
      weekday: "short",
      hour: "numeric",
      hour12: true,
    }),
  };
}

/**
 * Whether the coming hours trend cleaner or dirtier — the "is this about to
 * get better or worse?" question the 30-day trend chart cannot answer.
 */
export function shortTermTrend(hourly: HourPoint[]): {
  direction: "improving" | "worsening" | "steady";
  deltaAqi: number;
  summary: string;
} {
  if (hourly.length < 6) {
    return { direction: "steady", deltaAqi: 0, summary: "Not enough forecast data to call a trend." };
  }
  const sorted = [...hourly].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  const window = Math.min(6, Math.floor(sorted.length / 2));
  const mean = (points: HourPoint[]) => points.reduce((sum, p) => sum + p.aqi, 0) / points.length;

  const soon = mean(sorted.slice(0, window));
  const later = mean(sorted.slice(-window));
  const delta = Math.round(later - soon);

  if (Math.abs(delta) < 10) {
    return { direction: "steady", deltaAqi: delta, summary: "Air quality should hold roughly steady." };
  }
  if (delta < 0) {
    return {
      direction: "improving",
      deltaAqi: delta,
      summary: `Clearing up — AQI is forecast to fall about ${Math.abs(delta)} points, toward ${classifyRisk(
        Math.round(later)
      ).label.toLowerCase()} levels.`,
    };
  }
  return {
    direction: "worsening",
    deltaAqi: delta,
    summary: `Getting worse — AQI is forecast to climb about ${delta} points, toward ${classifyRisk(
      Math.round(later)
    ).label.toLowerCase()} levels.`,
  };
}
