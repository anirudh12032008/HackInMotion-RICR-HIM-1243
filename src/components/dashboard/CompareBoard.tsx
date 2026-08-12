"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/aqi/RiskBadge";
import {
  AqiBarChart,
  PollutantRadarChart,
  type ComparisonEntry,
} from "@/components/charts/ComparisonChart";
import { Pollutants } from "@/types/index";

const MAX_LOCATIONS = 4;
const MIN_LOCATIONS = 2;

const POLLUTANT_LABELS: { key: keyof Pollutants; label: string }[] = [
  { key: "pm25", label: "PM2.5" },
  { key: "pm10", label: "PM10" },
  { key: "o3", label: "O3" },
  { key: "no2", label: "NO2" },
];

export function CompareBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<ComparisonEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");

  const fetchCity = useCallback(async (city: string): Promise<ComparisonEntry> => {
    const res = await fetch(`/api/aqi/current?city=${encodeURIComponent(city)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `Couldn't find ${city}`);
    return {
      key: city,
      name: data.city.name.split(",")[0],
      aqi: data.aqi,
      dominantPollutant: data.dominantPollutant,
      pollutants: data.pollutants,
    };
  }, []);

  // Load cities named in the URL so a comparison can be shared as a link.
  useEffect(() => {
    const cities = searchParams.get("cities");
    if (!cities) return;

    const list = cities.split(",").filter(Boolean).slice(0, MAX_LOCATIONS);
    if (list.length === 0) return;

    setLoading(true);
    Promise.allSettled(list.map(fetchCity))
      .then((results) => {
        const ok = results
          .filter((r): r is PromiseFulfilledResult<ComparisonEntry> => r.status === "fulfilled")
          .map((r) => r.value);
        setEntries(ok);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncUrl(next: ComparisonEntry[]) {
    const params = new URLSearchParams();
    if (next.length > 0) params.set("cities", next.map((e) => e.key).join(","));
    router.replace(`/dashboard/compare${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }

  async function addCity(e: React.FormEvent) {
    e.preventDefault();
    const city = query.trim();
    if (!city) return;

    if (entries.length >= MAX_LOCATIONS) {
      toast.error(`You can compare up to ${MAX_LOCATIONS} locations`);
      return;
    }
    if (entries.some((entry) => entry.key.toLowerCase() === city.toLowerCase())) {
      toast.error("That location is already in the comparison");
      return;
    }

    setAdding(true);
    try {
      const entry = await fetchCity(city);
      const next = [...entries, entry];
      setEntries(next);
      syncUrl(next);
      setQuery("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add that location");
    } finally {
      setAdding(false);
    }
  }

  function removeCity(key: string) {
    const next = entries.filter((e) => e.key !== key);
    setEntries(next);
    syncUrl(next);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addCity} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add a city to compare..."
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={adding || entries.length >= MAX_LOCATIONS}>
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="ml-1.5 hidden sm:inline">Add location</span>
        </Button>
      </form>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm font-medium">Nothing to compare yet</p>
          <p className="text-sm text-muted-foreground">
            Add at least {MIN_LOCATIONS} cities to see them side by side.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {entries.map((entry) => (
              <Card key={entry.key}>
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-base">{entry.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCity(entry.key)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <RiskBadge aqi={entry.aqi} />
                    <span className="font-[family-name:var(--font-display)] text-3xl">
                      {entry.aqi}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dominant: {entry.dominantPollutant?.toUpperCase() ?? "—"}
                  </p>
                  <dl className="space-y-1 border-t border-border pt-2 text-xs">
                    {POLLUTANT_LABELS.map(({ key, label }) => (
                      <div key={key} className="flex justify-between">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd>{entry.pollutants[key] ?? "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>

          {entries.length >= MIN_LOCATIONS && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AQI side by side</CardTitle>
                </CardHeader>
                <CardContent>
                  <AqiBarChart entries={entries} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pollutant profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <PollutantRadarChart entries={entries} />
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
