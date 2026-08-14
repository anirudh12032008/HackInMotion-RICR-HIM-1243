"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AQIGauge } from "@/components/aqi/AQIGauge";
import { PollutantBreakdown } from "@/components/aqi/PollutantBreakdown";
import { HealthGuidance } from "@/components/aqi/HealthGuidance";
import { PollenWidget } from "@/components/aqi/PollenWidget";
import { ExposureInsights } from "@/components/aqi/ExposureInsights";
import type { AqiResult } from "@/components/dashboard/QuickSearch";
import type { UserHealthProfile } from "@/types/index";
import { pickHealthRecommendation } from "@/lib/health-recommendation";
import { subscribeToPush } from "@/lib/push-client";

const DEFAULT_PROFILE: UserHealthProfile = {
  conditions: [],
  ageGroup: "adult",
  activityLevel: "moderate",
};

export function AQICard({ result }: { result: AqiResult }) {
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const profile = session?.user?.healthProfile ?? DEFAULT_PROFILE;
  const recommendation = pickHealthRecommendation(
    result.healthRecommendations,
    profile.conditions,
    profile.activityLevel
  );

  async function saveLocation() {
    setSaving(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.city.name,
          city: result.city.name,
          lat: result.city.geo[0],
          lng: result.city.geo[1],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save location");
      }
      setSaved(true);
      toast.success(`${result.city.name} saved to your locations`);

      // First saved location is the natural moment to ask for push
      // permission — the user has just told us they want to track this
      // place, so alerts about it are obviously wanted, not a cold prompt
      // on first page load.
      subscribeToPush().catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{result.city.name}</CardTitle>
          <p className="text-xs text-muted-foreground">
            Updated {new Date(result.updatedAt).toLocaleString()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={saveLocation} disabled={saving || saved}>
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          <span className="ml-1.5">{saved ? "Saved" : "Save location"}</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <AQIGauge aqi={result.aqi} />
          <p className="mt-5 border-t border-border pt-3 text-sm text-muted-foreground">
            Dominant pollutant{" "}
            <span className="font-[family-name:var(--font-display)] font-medium text-foreground">
              {result.dominantPollutant?.toUpperCase()}
            </span>
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Pollutant breakdown</h3>
          <PollutantBreakdown pollutants={result.pollutants} />
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Health guidance</h3>
          <HealthGuidance aqi={result.aqi} profile={profile} />
        </div>

        <ExposureInsights
          aqi={result.aqi}
          pm25={result.pollutants?.pm25}
          hourly={result.forecast?.hourly ?? []}
          profile={profile}
          cityName={result.city.name.split(",")[0]}
        />

        {recommendation && (
          <div className="rounded-lg border border-primary/20 bg-accent/50 p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              From Google Air Quality
            </div>
            <p className="text-sm">{recommendation.text}</p>
          </div>
        )}

        <PollenWidget lat={result.city.geo[0]} lng={result.city.geo[1]} />
      </CardContent>
    </Card>
  );
}
