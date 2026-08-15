"use client";

import { useCallback } from "react";
import { APIProvider, Map, AdvancedMarker, Polyline } from "@vis.gl/react-google-maps";
import { classifyRisk } from "@/lib/risk-engine";
import type { RoutePoint, RouteSample } from "@/lib/route-risk";
import {
  MAPS_KEY,
  MAP_ID,
  useMapColorScheme,
  AqiHeatmapOverlay,
  MapClickListener,
  AqiLegend,
} from "@/components/map/shared";

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 }; // New Delhi

export function RoutePlanner({
  start,
  end,
  samples,
  roadPath,
  onSetPoint,
}: {
  start: RoutePoint | null;
  end: RoutePoint | null;
  samples: RouteSample[];
  roadPath?: RoutePoint[] | null;
  onSetPoint: (point: RoutePoint) => void;
}) {
  const colorScheme = useMapColorScheme();
  const handleClick = useCallback(
    (lat: number, lng: number) => onSetPoint({ lat, lng }),
    [onSetPoint]
  );

  if (!MAPS_KEY) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      </div>
    );
  }

  return (
    <APIProvider apiKey={MAPS_KEY}>
      <div className="relative h-full w-full">
        <Map
          mapId={MAP_ID}
          colorScheme={colorScheme}
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={11}
          gestureHandling="greedy"
          clickableIcons={false}
          style={{ width: "100%", height: "100%" }}
        >
          <AqiHeatmapOverlay opacity={0.5} />
          <MapClickListener onClick={handleClick} />

          {roadPath && roadPath.length > 1 ? (
            <Polyline path={roadPath} strokeColor="#1f5f4e" strokeOpacity={0.9} strokeWeight={4} />
          ) : (
            start &&
            end && (
              <Polyline
                path={[start, end]}
                strokeColor="#64748b"
                strokeOpacity={0.9}
                strokeWeight={3}
              />
            )
          )}

          {samples.map((sample, i) => (
            <AdvancedMarker key={i} position={sample} zIndex={2}>
              <SampleDot aqi={sample.aqi} />
            </AdvancedMarker>
          ))}

          {start && (
            <AdvancedMarker position={start} zIndex={10}>
              <EndpointPin label="A" />
            </AdvancedMarker>
          )}
          {end && (
            <AdvancedMarker position={end} zIndex={10}>
              <EndpointPin label="B" />
            </AdvancedMarker>
          )}
        </Map>

        <AqiLegend />
      </div>
    </APIProvider>
  );
}

/** A/B start/end pin. */
function EndpointPin({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-bold text-primary-foreground shadow-lg dark:border-white/80">
        {label}
      </div>
      <span className="-mt-1 h-2 w-2 rotate-45 border-b-2 border-r-2 border-white bg-primary shadow dark:border-white/80" />
    </div>
  );
}

/** Small dot along the route, colored by the AQI risk band there. */
function SampleDot({ aqi }: { aqi: number | null }) {
  const color = aqi !== null ? classifyRisk(aqi).color : "#94a3b8";
  return (
    <span
      title={aqi !== null ? `AQI ${aqi}` : "No data"}
      className="block h-3.5 w-3.5 rounded-full border border-white shadow dark:border-white/70"
      style={{ backgroundColor: color }}
    />
  );
}
