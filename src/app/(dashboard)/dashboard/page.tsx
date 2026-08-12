"use client";

import { useState } from "react";
import { QuickSearch, type AqiResult } from "@/components/dashboard/QuickSearch";
import { AQICard } from "@/components/aqi/AQICard";
import { SavedLocations } from "@/components/dashboard/SavedLocations";
import { ProfilePrompt } from "@/components/dashboard/ProfilePrompt";
import { Reveal } from "@/components/motion/Reveal";

export default function DashboardPage() {
  const [result, setResult] = useState<AqiResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleResult(r: AqiResult) {
    setResult(r);
    setRefreshKey((k) => k + 1);
  }

  return (
    <Reveal stagger className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Search any city or use your location to check current air quality.
        </p>
      </div>

      <ProfilePrompt />

      <QuickSearch onResult={handleResult} />

      {result && <AQICard result={result} />}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Saved locations</h2>
        <SavedLocations refreshKey={refreshKey} />
      </div>
    </Reveal>
  );
}
