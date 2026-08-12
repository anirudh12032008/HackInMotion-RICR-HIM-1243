"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, RotateCcw } from "lucide-react";
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
  averageAqi,
  getActivityGuidance,
  type ActivityType,
  type RoutePoint,
  type RouteSample,
} from "@/lib/route-risk";

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
    }
  }

  async function loadRouteAqi(from: RoutePoint, to: RoutePoint) {
    setLoading(true);
    const points = sampleRoute(from, to);
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
  }

  const avgAqi = averageAqi(samples);
  const guidance = getActivityGuidance(activity, avgAqi);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl flex-col gap-4">
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
          <Button variant="outline" size="icon" onClick={reset} disabled={!start}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(loading || avgAqi !== null) && (
        <Alert variant={guidance.recommended ? "default" : "destructive"}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          <AlertTitle>{loading ? "Checking air quality along your route..." : "Route risk"}</AlertTitle>
          {!loading && <AlertDescription>{guidance.message}</AlertDescription>}
        </Alert>
      )}

      <Card className="min-h-0 flex-1 overflow-hidden p-0">
        <CardContent className="h-full p-0">
          <RoutePlanner start={start} end={end} samples={samples} onSetPoint={handleSetPoint} />
        </CardContent>
      </Card>
    </div>
  );
}
