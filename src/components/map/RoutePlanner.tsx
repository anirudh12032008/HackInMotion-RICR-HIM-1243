"use client";

import { useEffect } from "react";
import { APIProvider, Map, Marker, Polyline, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { classifyRisk } from "@/lib/risk-engine";
import type { RoutePoint, RouteSample } from "@/lib/route-risk";

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 }; // New Delhi
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

function AqiHeatmapOverlay() {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google) return;

    const overlay = new window.google.maps.ImageMapType({
      getTileUrl: (coord, zoom) => `/api/aqi/heatmap-tile/UAQI_RED_GREEN/${zoom}/${coord.x}/${coord.y}`,
      tileSize: new window.google.maps.Size(256, 256),
      opacity: 0.5,
      name: "AQI",
    });

    map.overlayMapTypes.insertAt(0, overlay);
    return () => {
      const idx = map.overlayMapTypes.getArray().indexOf(overlay);
      if (idx > -1) map.overlayMapTypes.removeAt(idx);
    };
  }, [map]);

  return null;
}

function ClickListener({ onClick }: { onClick: (point: RoutePoint) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) onClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
    return () => listener.remove();
  }, [map, onClick]);

  return null;
}

function SampleMarkers({ samples }: { samples: RouteSample[] }) {
  const markerLib = useMapsLibrary("marker");
  const core = useMapsLibrary("core");
  if (!markerLib || !core) return null;

  return (
    <>
      {samples.map((sample, i) => {
        const color = sample.aqi !== null ? classifyRisk(sample.aqi).color : "#94a3b8";
        return (
          <Marker
            key={i}
            position={sample}
            title={sample.aqi !== null ? `AQI ${sample.aqi}` : undefined}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: color,
              fillOpacity: 0.85,
              strokeColor: color,
              strokeWeight: 1,
            }}
          />
        );
      })}
    </>
  );
}

export function RoutePlanner({
  start,
  end,
  samples,
  onSetPoint,
}: {
  start: RoutePoint | null;
  end: RoutePoint | null;
  samples: RouteSample[];
  onSetPoint: (point: RoutePoint) => void;
}) {
  if (!MAPS_KEY) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      </div>
    );
  }

  return (
    <APIProvider apiKey={MAPS_KEY}>
      <Map
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={11}
        gestureHandling="greedy"
        disableDefaultUI={false}
        style={{ width: "100%", height: "100%" }}
      >
        <AqiHeatmapOverlay />
        <ClickListener onClick={onSetPoint} />

        {start && <Marker position={start} />}
        {end && <Marker position={end} />}
        {start && end && (
          <Polyline
            path={[start, end]}
            strokeColor="#94a3b8"
            strokeOpacity={0.8}
            strokeWeight={2}
          />
        )}

        <SampleMarkers samples={samples} />
      </Map>
    </APIProvider>
  );
}
