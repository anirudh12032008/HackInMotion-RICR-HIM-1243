import axios from "axios";
import type { RoutePoint } from "@/lib/route-risk";

const API_KEY = process.env.GOOGLE_API_KEY;
const DIRECTIONS_BASE = "https://maps.googleapis.com/maps/api/directions/json";

export class GoogleDirectionsError extends Error {}

export interface DirectionsResult {
  path: RoutePoint[];
  distanceMeters: number;
  durationSeconds: number;
}

export async function getDirections(
  origin: RoutePoint,
  destination: RoutePoint,
  mode: "walking" | "bicycling" | "driving" = "walking"
): Promise<DirectionsResult> {
  if (!API_KEY) throw new GoogleDirectionsError("Missing GOOGLE_API_KEY environment variable");

  const { data } = await axios.get(DIRECTIONS_BASE, {
    params: {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      mode,
      key: API_KEY,
    },
  });

  if (data.status !== "OK" || !data.routes?.length) {
    throw new GoogleDirectionsError("Couldn't find a route between those points");
  }

  const route = data.routes[0];
  const leg = route.legs[0];

  return {
    path: decodePolyline(route.overview_polyline.points),
    distanceMeters: leg.distance.value,
    durationSeconds: leg.duration.value,
  };
}

/** Decodes Google's polyline encoding (https://developers.google.com/maps/documentation/utilities/polylinealgorithm). */
function decodePolyline(encoded: string): RoutePoint[] {
  const points: RoutePoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}
