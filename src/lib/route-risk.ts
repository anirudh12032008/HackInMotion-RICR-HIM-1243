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

function haversineKm(a: RoutePoint, b: RoutePoint): number {
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
