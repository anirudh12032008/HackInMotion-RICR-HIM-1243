"use client";

import { useCallback, useState } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { Loader2, MousePointerClick } from "lucide-react";
import type { AqiResult } from "@/components/dashboard/QuickSearch";
import {
  MAPS_KEY,
  MAP_ID,
  HEATMAP_STYLES,
  type HeatmapStyleId,
  useMapColorScheme,
  AqiHeatmapOverlay,
  AqiLegend,
  MapClickListener,
  RecenterOnChange,
} from "@/components/map/shared";

/**
 * Interactive AQI map for the dashboard: shows the searched location on
 * Google's live heatmap and lets the user tap anywhere to read the air
 * quality there (reusing /api/aqi/current), turning the heatmap colours into
 * concrete numbers.
 */
export function AqiMap({
  result,
  onResult,
}: {
  result: AqiResult;
  onResult: (r: AqiResult) => void;
}) {
  const [style, setStyle] = useState<HeatmapStyleId>("UAQI_RED_GREEN");
  const [loading, setLoading] = useState(false);
  const colorScheme = useMapColorScheme();

  const [lat, lng] = result.city.geo;

  const checkPoint = useCallback(
    async (clat: number, clng: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/aqi/current?lat=${clat}&lng=${clng}`);
        const data = await res.json();
        if (res.ok) onResult(data);
      } catch {
        /* transient  the card keeps the previous reading */
      } finally {
        setLoading(false);
      }
    },
    [onResult]
  );

  if (!MAPS_KEY) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border bg-muted/30 text-sm text-muted-foreground">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map.
      </div>
    );
  }

  return (
    <div className="relative h-[320px] overflow-hidden rounded-xl border shadow-sm sm:h-[400px]">
      <APIProvider apiKey={MAPS_KEY}>
        <Map
          mapId={MAP_ID}
          colorScheme={colorScheme}
          defaultCenter={{ lat, lng }}
          defaultZoom={11}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          clickableIcons={false}
          style={{ width: "100%", height: "100%" }}
        >
          <AqiHeatmapOverlay mapType={style} opacity={0.6} />
          <MapClickListener onClick={checkPoint} />
          <RecenterOnChange center={result.city.geo} />
          <AdvancedMarker position={{ lat, lng }} title={result.city.name}>
            <AqiChip aqi={result.aqi} color={result.risk.color} emoji={result.risk.emoji} />
          </AdvancedMarker>
        </Map>
      </APIProvider>

      {/* heatmap-style toggle */}
      <div className="absolute right-3 top-3 z-10 flex gap-0.5 rounded-lg border border-border/60 bg-card/85 p-1 text-xs shadow-md backdrop-blur">
        {HEATMAP_STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStyle(s.id)}
            className={`rounded-md px-2 py-1 font-medium transition-colors ${
              style === s.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* interaction hint / loading feedback */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-border/60 bg-card/85 px-3 py-1 text-xs text-muted-foreground shadow-md backdrop-blur">
        {loading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking air here…
          </>
        ) : (
          <>
            <MousePointerClick className="h-3 w-3" />
            Tap the map to check AQI
          </>
        )}
      </div>

      <AqiLegend />
    </div>
  );
}

/** Rounded AQI pill with a downward tail, pulsing in its risk colour. */
function AqiChip({ aqi, color, emoji }: { aqi: number; color: string; emoji: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <span
          className="absolute -inset-1.5 animate-ping rounded-full opacity-25"
          style={{ backgroundColor: color }}
        />
        <div
          className="relative flex items-center gap-1 rounded-full border-2 border-white px-2.5 py-1 text-sm font-bold text-white shadow-lg dark:border-white/80"
          style={{ backgroundColor: color }}
        >
          <span>{emoji}</span>
          <span>{aqi}</span>
        </div>
      </div>
      <span
        className="-mt-1 h-2.5 w-2.5 rotate-45 border-b-2 border-r-2 border-white shadow dark:border-white/80"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
