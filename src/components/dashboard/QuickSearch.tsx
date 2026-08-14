"use client";

import { useState } from "react";
import { Search, Loader2, MapPin, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface AqiResult {
  aqi: number;
  dominantPollutant: string;
  city: { name: string; geo: [number, number] };
  updatedAt: string;
  pollutants: Record<string, number | undefined>;
  forecast: {
    daily?: { pm25?: { day: string; avg: number; min: number; max: number }[] };
    hourly?: { dateTime: string; aqi: number }[];
  } | null;
  risk: { level: string; label: string; color: string; bgColor: string; emoji: string; description: string };
  healthRecommendations?: {
    generalPopulation?: string;
    elderly?: string;
    lungDiseasePopulation?: string;
    heartDiseasePopulation?: string;
    athletes?: string;
    pregnantWomen?: string;
    children?: string;
  } | null;
}

export function QuickSearch({ onResult }: { onResult: (result: AqiResult) => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  async function fetchAndEmit(url: string) {
    setLoading(true);
    setError("");
    setLastUrl(url);
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not fetch air quality");
      onResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    fetchAndEmit(`/api/aqi/current?city=${encodeURIComponent(query.trim())}`);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchAndEmit(`/api/aqi/current?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
      },
      () => {
        setLoading(false);
        setError("Unable to access your location");
      }
    );
  }

  function retry() {
    if (lastUrl) fetchAndEmit(lastUrl);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a city..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
          <Button type="button" variant="outline" onClick={useMyLocation} disabled={loading}>
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Use my location</span>
          </Button>
        </div>
      </form>
      {error && (
        <Alert variant="destructive" className="mt-2 flex items-center justify-between">
          <AlertDescription>{error}</AlertDescription>
          {lastUrl && (
            <Button variant="ghost" size="sm" className="h-7 shrink-0" onClick={retry}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Retry
            </Button>
          )}
        </Alert>
      )}
    </div>
  );
}
