"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { classifyRisk } from "@/lib/risk-engine";
import { LandingMapPreview } from "@/components/landing/LandingMapPreview";

interface QuickResult {
  aqi: number;
  city: { name: string; geo: [number, number] };
}

export function QuickSearchTeaser() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<QuickResult | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/aqi/current?city=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Location not found");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const risk = result ? classifyRisk(result.aqi) : null;

  return (
    <div className="mx-auto w-full max-w-lg">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a city (e.g. Delhi, London, Tokyo)"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check AQI"}
        </Button>
      </form>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && risk && (
        <div
          className="mt-4 flex items-center justify-between rounded-lg border border-border px-5 py-4"
        >
          <div>
            <p className="text-sm font-medium">{result.city.name}</p>
            <p className="text-xs text-muted-foreground">{risk.label}</p>
          </div>
          <span
            className="font-[family-name:var(--font-display)] text-3xl"
            style={{ color: risk.color }}
          >
            {result.aqi}
          </span>
        </div>
      )}

      {result && (
        <LandingMapPreview lat={result.city.geo[0]} lng={result.city.geo[1]} aqi={result.aqi} />
      )}

      {result && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Want personalized guidance and alerts?{" "}
          <button
            onClick={() => router.push("/signup")}
            className="font-medium text-primary hover:underline"
          >
            Sign up free
          </button>
        </p>
      )}
    </div>
  );
}
