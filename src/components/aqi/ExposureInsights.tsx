"use client";

import { useEffect, useMemo, useState } from "react";
import { Cigarette, Clock, TrendingDown, TrendingUp, Minus, Wind, Volume2, VolumeX, Watch, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { classifyRisk } from "@/lib/risk-engine";
import { estimateExposure } from "@/lib/exposure";
import {
  findCleanAirWindows,
  safeAqiCeiling,
  shortTermTrend,
  worstHour,
  type HourPoint,
} from "@/lib/clean-air-windows";
import type { UserHealthProfile } from "@/types/index";
import { canSpeak, speak, stopSpeak } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
  connectHeartRateMonitor,
  isWearableSupported,
  type WearableConnection,
} from "@/lib/wearable";

/**
 * The two panels that turn a number into a decision: what this air is costing
 * *you* right now, and when to step outside instead of whether to.
 */
export function ExposureInsights({
  aqi,
  pm25,
  hourly,
  profile,
  cityName,
}: {
  aqi: number;
  pm25?: number;
  hourly: HourPoint[];
  profile: UserHealthProfile;
  cityName: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ExposureCard aqi={aqi} pm25={pm25} profile={profile} cityName={cityName} />
      <CleanAirWindowsCard hourly={hourly} profile={profile} cityName={cityName} />
    </div>
  );
}

function ExposureCard({
  aqi,
  pm25,
  profile,
  cityName,
}: {
  aqi: number;
  pm25?: number;
  profile: UserHealthProfile;
  cityName: string;
}) {
  const { locale } = useTranslation();
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [wearable, setWearable] = useState<WearableConnection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Stop any in-progress narration when this card unmounts (e.g. a new
    // city search replaces it) so speech doesn't keep playing over stale text.
    return () => stopSpeak();
  }, []);

  useEffect(() => {
    // Disconnect the Bluetooth GATT link when this card unmounts (e.g. the
    // user searches a new city) so the browser doesn't hold a dangling
    // connection to the device.
    return () => wearable?.disconnect();
  }, [wearable]);

  async function toggleWearable() {
    if (wearable) {
      wearable.disconnect();
      setWearable(null);
      setHeartRate(null);
      return;
    }
    setConnecting(true);
    try {
      const connection = await connectHeartRateMonitor(setHeartRate);
      setWearable(connection);
      toast.success(`Connected to ${connection.deviceName} — live dose is now heart-rate based.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't connect to a wearable.");
    } finally {
      setConnecting(false);
    }
  }

  const exposure = useMemo(
    () => estimateExposure(aqi, pm25, profile, heartRate ?? undefined),
    [aqi, pm25, profile, heartRate]
  );
  const risk = classifyRisk(aqi);

  // Cap the drawn icons so hazardous air doesn't render forty cigarettes.
  const shown = Math.min(Math.round(exposure.cigarettesPerDay), 20);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Cigarette className="h-4 w-4" style={{ color: risk.color }} />
          What this air costs you
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{exposure.headline}</p>

        {shown > 0 && (
          <div className="flex flex-wrap items-center gap-1" aria-hidden>
            {Array.from({ length: shown }).map((_, i) => (
              <Cigarette key={i} className="h-4 w-4" style={{ color: risk.color }} />
            ))}
            {exposure.cigarettesPerDay > 20 && (
              <span className="text-xs text-muted-foreground">
                +{Math.round(exposure.cigarettesPerDay) - 20} more
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
          <Metric label="PM2.5" value={`${exposure.pm25}`} unit="µg/m³" />
          <Metric label="Inhaled / hr" value={`${exposure.microgramsPerHour}`} unit="µg outdoors" />
          <Metric label="WHO limit" value={`${exposure.timesWhoGuideline}×`} unit="over guideline" />
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {heartRate
            ? "Dose is scaled to your live heart rate below — this is more personal than a self-reported activity level."
            : (
              <>
                Dose is scaled to your <strong>{profile.activityLevel}</strong> activity level and{" "}
                <strong>{profile.ageGroup}</strong> age group — identical air delivers very
                different amounts depending on how hard you breathe.
              </>
            )}
          {exposure.estimated && " PM2.5 estimated from AQI (no direct reading for this area)."}
        </p>

        {isWearableSupported() && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Watch className="h-4 w-4 text-muted-foreground" />
              {heartRate ? (
                <span>
                  <strong>{heartRate}</strong> bpm live · {wearable?.deviceName}
                </span>
              ) : (
                <span className="text-muted-foreground">No wearable connected</span>
              )}
            </div>
            <Button
              variant={wearable ? "ghost" : "outline"}
              size="sm"
              disabled={connecting}
              onClick={toggleWearable}
            >
              {wearable ? (
                <>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Disconnect
                </>
              ) : connecting ? (
                "Connecting…"
              ) : (
                "Connect wearable"
              )}
            </Button>
          </div>
        )}

        {canSpeak() && (
          <Button
            variant={isSpeaking ? "destructive" : "outline"}
            size="sm"
            className="w-full"
            onClick={async () => {
              if (isSpeaking) {
                stopSpeak();
                setIsSpeaking(false);
                return;
              }
              const utterance = await speak(
                `Air quality in ${cityName} is ${aqi}, ${risk.label}. ${exposure.headline}`,
                locale
              );
              if (!utterance) return;
              setIsSpeaking(true);
              utterance.onend = () => setIsSpeaking(false);
              utterance.onerror = () => setIsSpeaking(false);
            }}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="mr-2 h-4 w-4" />
                Stop reading
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                Read this aloud
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function CleanAirWindowsCard({
  hourly,
  profile,
  cityName,
}: {
  hourly: HourPoint[];
  profile: UserHealthProfile;
  cityName: string;
}) {
  const ceiling = safeAqiCeiling(profile);
  const windows = useMemo(() => findCleanAirWindows(hourly, ceiling), [hourly, ceiling]);
  const trend = useMemo(() => shortTermTrend(hourly), [hourly]);
  const peak = useMemo(() => worstHour(hourly), [hourly]);

  const TrendIcon =
    trend.direction === "improving" ? TrendingDown : trend.direction === "worsening" ? TrendingUp : Minus;
  const trendColor =
    trend.direction === "improving" ? "#22c55e" : trend.direction === "worsening" ? "#ef4444" : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-primary" />
          Best time to go outside
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hourly.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hourly forecast available for {cityName} right now.
          </p>
        ) : windows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hour in the next 48 stays below AQI {ceiling}, your personal safe ceiling. Plan
            indoor alternatives and keep windows closed.
          </p>
        ) : (
          <ul className="space-y-2">
            {windows.map((w) => {
              const risk = classifyRisk(w.averageAqi);
              return (
                <li
                  key={w.start}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{w.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.hours}h clear · peaks at AQI {w.peakAqi}
                    </p>
                  </div>
                  <span
                    className="font-[family-name:var(--font-display)] text-2xl"
                    style={{ color: risk.color }}
                  >
                    {w.averageAqi}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {hourly.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <TrendIcon className="h-3.5 w-3.5 shrink-0" style={{ color: trendColor }} />
              {trend.summary}
            </p>
            {peak && (
              <p className="flex items-center gap-2">
                <Wind className="h-3.5 w-3.5 shrink-0" />
                Worst hour ahead: {peak.label} at AQI {peak.aqi}.
              </p>
            )}
            <p>
              Windows are picked against an AQI ceiling of <strong>{ceiling}</strong>, derived from
              your health profile.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-[family-name:var(--font-display)] text-xl leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground">{unit}</p>
    </div>
  );
}
