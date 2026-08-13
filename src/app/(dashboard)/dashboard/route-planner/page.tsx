"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Clock, Loader2, MapPin, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  sampleRoute,
  sampleAlongPath,
  averageAqi,
  getActivityGuidance,
  routeDistanceKm,
  estimateDurationMin,
  type ActivityType,
  type RoutePoint,
  type RouteSample,
} from "@/lib/route-risk";

const DIRECTIONS_MODE: Record<ActivityType, "walking" | "bicycling" | "driving"> = {
  jogging: "walking",
  walking: "walking",
  cycling: "bicycling",
  driving: "driving",
};

const RoutePlanner = dynamic(
  () => import("@/components/map/RoutePlanner").then((m) => m.RoutePlanner),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> }
);

const ACTIVITIES: { value: ActivityType; label: string }[] = [
  { value: "jogging", label: "Jogging" },
  { value: "cycling", label: "Cycling" },
  { value: "walking", label: "Walking" },
  { value: "driving", label: "Driving" },
];

export default function RoutePlannerPage() {
  const [start, setStart] = useState<RoutePoint | null>(null);
  const [end, setEnd] = useState<RoutePoint | null>(null);
  const [samples, setSamples] = useState<RouteSample[]>([]);
  const [roadPath, setRoadPath] = useState<RoutePoint[] | null>(null);
  const [directionsInfo, setDirectionsInfo] = useState<{ distanceKm: number; durationMin: number } | null>(
    null
  );
  const [activity, setActivity] = useState<ActivityType>("jogging");
  const [loading, setLoading] = useState(false);

  function handleSetPoint(point: RoutePoint) {
    if (!start) {
      setStart(point);
    } else if (!end) {
      setEnd(point);
      loadRouteAqi(start, point);
    } else {
      setStart(point);
      setEnd(null);
      setSamples([]);
      setRoadPath(null);
      setDirectionsInfo(null);
    }
  }

  async function loadRouteAqi(from: RoutePoint, to: RoutePoint) {
    setLoading(true);
    setRoadPath(null);
    setDirectionsInfo(null);

    let points: RoutePoint[];
    try {
      const res = await fetch("/api/route/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: from, end: to, mode: DIRECTIONS_MODE[activity] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRoadPath(data.path);
      setDirectionsInfo({
        distanceKm: data.distanceMeters / 1000,
        durationMin: Math.round(data.durationSeconds / 60),
      });
      points = sampleAlongPath(data.path);
    } catch {
      // Directions unavailable (API not enabled, no route found) — fall back
      // to straight-line sampling so the feature degrades instead of breaking.
      points = sampleRoute(from, to);
    }

    const results = await Promise.all(
      points.map(async (p): Promise<RouteSample> => {
        try {
          const res = await fetch(`/api/aqi/current?lat=${p.lat}&lng=${p.lng}`);
          const data = await res.json();
          return { ...p, aqi: res.ok ? data.aqi : null };
        } catch {
          return { ...p, aqi: null };
        }
      })
    );
    setSamples(results);
    setLoading(false);
  }

  function reset() {
    setStart(null);
    setEnd(null);
    setSamples([]);
    setRoadPath(null);
    setDirectionsInfo(null);
  }

  function useMyLocationAsStart() {
    if (!navigator.geolocation) {
      toast.error("Geolocation isn't available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => handleSetPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error("Couldn't get your location. Click the map to set a start point.")
    );
  }

  const avgAqi = averageAqi(samples);
  const guidance = getActivityGuidance(activity, avgAqi);
  const distanceKm = start && end ? routeDistanceKm(start, end) : null;
  const durationMin = distanceKm !== null ? estimateDurationMin(distanceKm, activity) : null;

  return (
    <div className="mx-auto flex min-h-[600px] max-w-6xl flex-col gap-4 sm:h-[calc(100vh-8rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Route planner</h1>
          <p className="text-sm text-muted-foreground">
            {!start
              ? "Click the map to set a start point."
              : !end
                ? "Click again to set your destination."
                : "Route set — click anywhere to start a new one."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={activity} onValueChange={(v) => v && setActivity(v as ActivityType)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITIES.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={useMyLocationAsStart}
            disabled={loading}
            className="hidden sm:inline-flex"
          >
            <MapPin className="h-4 w-4" />
            Use my location
          </Button>
          <Button variant="outline" size="icon" onClick={reset} disabled={!start}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {distanceKm !== null && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />~
            {(directionsInfo?.distanceKm ?? distanceKm).toFixed(1)} km
            {directionsInfo ? "" : " (straight-line)"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />~{directionsInfo?.durationMin ?? durationMin} min {activity}
          </span>
        </div>
      )}

      {(loading || avgAqi !== null) && (
        <Alert variant={guidance.recommended ? "default" : "destructive"}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          <AlertTitle>{loading ? "Checking air quality along your route..." : "Route risk"}</AlertTitle>
          {!loading && <AlertDescription>{guidance.message}</AlertDescription>}
        </Alert>
      )}

      {!loading && !guidance.recommended && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Best time</AlertTitle>
          <AlertDescription>
            Air quality tends to improve later in the day or after rain — check back before
            heading out, or move this {activity} indoors for now.
          </AlertDescription>
        </Alert>
      )}

      <Card className="min-h-0 flex-1 overflow-hidden p-0">
        <CardContent className="h-full p-0">
          <RoutePlanner
            start={start}
            end={end}
            samples={samples}
            roadPath={roadPath}
            onSetPoint={handleSetPoint}
          />
        </CardContent>
      </Card>
    </div>
  );
}
