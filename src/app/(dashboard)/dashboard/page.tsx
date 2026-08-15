"use client";

import { useState } from "react";
import { QuickSearch, type AqiResult } from "@/components/dashboard/QuickSearch";
import { AQICard } from "@/components/aqi/AQICard";
import { AqiMap } from "@/components/map/AqiMap";
import { SavedLocations } from "@/components/dashboard/SavedLocations";
import { ProfilePrompt } from "@/components/dashboard/ProfilePrompt";
import { Reveal } from "@/components/motion/Reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";

export default function DashboardPage() {
  const { t } = useTranslation();
  const [result, setResult] = useState<AqiResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searching, setSearching] = useState(false);

  function handleResult(r: AqiResult) {
    setResult(r);
    setRefreshKey((k) => k + 1);
  }

  function handleSelectSaved(r: AqiResult) {
    setResult(r);
    // Saved locations render below the AQI card, so a click there needs to
    // scroll up to the card it just loaded rather than leaving the user
    // looking at the list they just clicked in.
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  return (
    <Reveal stagger className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <ProfilePrompt />

      <QuickSearch onResult={handleResult} onLoadingChange={setSearching} />

      {searching && !result && (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}

      {result && <AqiMap result={result} onResult={handleResult} />}

      {result && <AQICard result={result} />}

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("dashboard.savedLocations")}</h2>
        <SavedLocations refreshKey={refreshKey} onSelect={handleSelectSaved} />
      </div>
    </Reveal>
  );
}
