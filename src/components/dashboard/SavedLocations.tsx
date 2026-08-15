"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, MapPin, LineChart, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/aqi/RiskBadge";
import { TrendChart } from "@/components/charts/TrendChart";
import type { AqiResult } from "@/components/dashboard/QuickSearch";

interface SavedLocation {
  _id: string;
  name: string;
  city?: string;
  lat: number;
  lng: number;
  currentAqi: number | null;
  error?: string;
  updatedAt?: string;
}

export function SavedLocations({
  refreshKey,
  onSelect,
}: {
  refreshKey?: number;
  /** Loads the full AQI card for a saved location, same as searching its city. */
  onSelect?: (result: AqiResult) => void;
}) {
  const [locations, setLocations] = useState<SavedLocation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      setLocations(data.locations ?? []);
    } catch {
      toast.error("Failed to load saved locations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function selectLocation(loc: SavedLocation) {
    if (!onSelect) return;
    setLoadingId(loc._id);
    try {
      const res = await fetch(`/api/aqi/current?lat=${loc.lat}&lng=${loc.lng}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load this location");
      onSelect(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load this location");
    } finally {
      setLoadingId(null);
    }
  }

  async function remove(id: string) {
    const prev = locations;
    setLocations((locs) => locs?.filter((l) => l._id !== id) ?? null);
    const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setLocations(prev ?? null);
      toast.error("Failed to remove location");
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
        <MapPin className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">No saved locations yet</p>
        <p className="text-sm text-muted-foreground">
          Search a city above and save it to track it here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {locations.map((loc) => (
        <Card
          key={loc._id}
          onClick={() => selectLocation(loc)}
          className={
            onSelect
              ? "cursor-pointer transition-shadow hover:ring-2 hover:ring-ring/40"
              : undefined
          }
        >
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <CardTitle className="text-base">{loc.name}</CardTitle>
            <div className="flex items-center gap-1">
              {loadingId === loc._id && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(expanded === loc._id ? null : loc._id);
                }}
              >
                <LineChart className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(loc._id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loc.currentAqi !== null ? (
              <div className="flex items-center justify-between">
                <RiskBadge aqi={loc.currentAqi} />
                <span className="text-2xl font-bold">{loc.currentAqi}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{loc.error ?? "Unavailable"}</p>
            )}
            {loc.updatedAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                Updated {new Date(loc.updatedAt).toLocaleString()}
              </p>
            )}
            {expanded === loc._id && (
              <div
                className="mt-4 border-t border-border pt-4"
                onClick={(e) => e.stopPropagation()}
              >
                <TrendChart locationId={loc._id} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
