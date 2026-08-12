"use client";

import { useState } from "react";
import { QuickSearch, type AqiResult } from "@/components/dashboard/QuickSearch";
import { AQICard } from "@/components/aqi/AQICard";
import { SavedLocations } from "@/components/dashboard/SavedLocations";
import { ProfilePrompt } from "@/components/dashboard/ProfilePrompt";
import { Reveal } from "@/components/motion/Reveal";
import { useTranslation } from "@/lib/i18n";

export default function DashboardPage() {
  const { t } = useTranslation();
  const [result, setResult] = useState<AqiResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleResult(r: AqiResult) {
    setResult(r);
    setRefreshKey((k) => k + 1);
  }

  return (
    <Reveal stagger className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <ProfilePrompt />

      <QuickSearch onResult={handleResult} />

      {result && <AQICard result={result} />}

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("dashboard.savedLocations")}</h2>
        <SavedLocations refreshKey={refreshKey} />
      </div>
    </Reveal>
  );
}
