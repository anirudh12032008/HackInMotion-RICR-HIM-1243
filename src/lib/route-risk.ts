import { classifyRisk } from "@/lib/risk-engine";

export type ActivityType = "jogging" | "cycling" | "walking" | "driving";

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteSample extends RoutePoint {
  aqi: number | null;
}

// Thresholds above which each activity is "not recommended" — driving is
// least exposed (windows/AC), jogging is most (sustained heavy breathing).
const ACTIVITY_THRESHOLDS: Record<ActivityType, number> = {
  jogging: 100,
  cycling: 120,
  walking: 150,
  driving: 200,
};

/**
 * Straight-line interpolation between two points, sampled every ~2km.
 * ponytail: no real road routing (no directions API configured) — a proper
 * route would follow roads; swap in a routing provider if that's needed later.
 */
const MAX_SAMPLES = 8;

export function sampleRoute(start: RoutePoint, end: RoutePoint, waypoints: RoutePoint[] = []): RoutePoint[] {
  const path = [start, ...waypoints, end];
  const samples: RoutePoint[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const distanceKm = haversineKm(a, b);
    const steps = Math.min(MAX_SAMPLES, Math.max(1, Math.round(distanceKm / 2)));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      samples.push({
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      });
    }
  }

  return samples;
}

/** Samples evenly-spaced points (~every 2km, capped) along a real road path from Directions API. */
export function sampleAlongPath(path: RoutePoint[]): RoutePoint[] {
  if (path.length <= 1) return path;

  let totalKm = 0;
  for (let i = 0; i < path.length - 1; i++) totalKm += haversineKm(path[i], path[i + 1]);

  const targetSamples = Math.min(MAX_SAMPLES * 3, Math.max(2, Math.round(totalKm / 2)));
  const stepKm = totalKm / (targetSamples - 1);

  const samples: RoutePoint[] = [path[0]];
  let distSinceLastSample = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const segKm = haversineKm(path[i], path[i + 1]);
    let covered = 0;

    while (distSinceLastSample + (segKm - covered) >= stepKm) {
      const remaining = stepKm - distSinceLastSample;
      const t = (covered + remaining) / segKm;
      samples.push({
        lat: path[i].lat + (path[i + 1].lat - path[i].lat) * t,
        lng: path[i].lng + (path[i + 1].lng - path[i].lng) * t,
      });
      covered += remaining;
      distSinceLastSample = 0;
    }
    distSinceLastSample += segKm - covered;
  }

  samples.push(path[path.length - 1]);
  return samples;
}

export function haversineKm(a: RoutePoint, b: RoutePoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function averageAqi(samples: RouteSample[]): number | null {
  const valid = samples.filter((s): s is RouteSample & { aqi: number } => s.aqi !== null);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((sum, s) => sum + s.aqi, 0) / valid.length);
}

// Rough average speeds (km/h) per activity, for a straight-line time estimate.
const ACTIVITY_SPEEDS: Record<ActivityType, number> = {
  walking: 5,
  jogging: 9,
  cycling: 18,
  driving: 30, // urban average, accounting for traffic and lights
};

/** Straight-line ("as the crow flies") distance of the route in km. */
export function routeDistanceKm(
  start: RoutePoint,
  end: RoutePoint,
  waypoints: RoutePoint[] = []
): number {
  const path = [start, ...waypoints, end];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) total += haversineKm(path[i], path[i + 1]);
  return total;
}

/** Rough travel time in minutes for an activity over a straight-line distance. */
export function estimateDurationMin(distanceKm: number, activity: ActivityType): number {
  return Math.max(1, Math.round((distanceKm / ACTIVITY_SPEEDS[activity]) * 60));
}

export function getActivityGuidance(activity: ActivityType, avgAqi: number | null) {
  if (avgAqi === null) {
    return { recommended: true, message: "Not enough air quality data along this route yet." };
  }

  const threshold = ACTIVITY_THRESHOLDS[activity];
  const risk = classifyRisk(avgAqi);

  if (avgAqi <= threshold) {
    return {
      recommended: true,
      message: `AQI averages ${avgAqi} along your route (${risk.label}) — reasonable for ${activity}.`,
    };
  }

  return {
    recommended: false,
    message: `AQI averages ${avgAqi} at your route (${risk.label}). Not recommended for ${activity}. Consider an indoor alternative or checking back later.`,
  };
}
