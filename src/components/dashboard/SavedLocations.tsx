"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/aqi/RiskBadge";

interface SavedLocation {
  _id: string;
  name: string;
  city?: string;
  currentAqi: number | null;
  error?: string;
  updatedAt?: string;
}

export function SavedLocations({ refreshKey }: { refreshKey?: number }) {
  const [locations, setLocations] = useState<SavedLocation[] | null>(null);
  const [loading, setLoading] = useState(true);

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
        <Card key={loc._id}>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <CardTitle className="text-base">{loc.name}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => remove(loc._id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
