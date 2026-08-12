"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useMap, ColorScheme } from "@vis.gl/react-google-maps";
import { RISK_BANDS } from "@/lib/risk-engine";

export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// AdvancedMarkers and vector rendering (needed for theme-aware maps) require a
// Map ID. A real, style-free ID from the Cloud console gives the best result;
// DEMO_MAP_ID is Google's public testing ID and works with no setup.
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

/** Google AQI heatmap tile styles exposed in the on-map toggle. */
export const HEATMAP_STYLES = [
  { id: "UAQI_RED_GREEN", label: "Universal" },
  { id: "US_AQI", label: "US AQI" },
  { id: "PM25_INDIGO_PERSIAN", label: "PM2.5" },
] as const;

export type HeatmapStyleId = (typeof HEATMAP_STYLES)[number]["id"];

/** Map colour scheme that follows the app's light/dark theme. */
export function useMapColorScheme(): ColorScheme {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? ColorScheme.DARK : ColorScheme.LIGHT;
}

/**
 * Google's AQI heatmap tiles, proxied through /api/aqi/heatmap-tile so the
 * server key stays private. Re-creates the overlay when the style changes.
 */
export function AqiHeatmapOverlay({
  mapType = "UAQI_RED_GREEN",
  opacity = 0.55,
}: {
  mapType?: string;
  opacity?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google) return;

    const overlay = new window.google.maps.ImageMapType({
      getTileUrl: (coord, zoom) =>
        `/api/aqi/heatmap-tile/${mapType}/${zoom}/${coord.x}/${coord.y}`,
      tileSize: new window.google.maps.Size(256, 256),
      opacity,
      name: "AQI",
    });

    map.overlayMapTypes.insertAt(0, overlay);
    return () => {
      const idx = map.overlayMapTypes.getArray().indexOf(overlay);
      if (idx > -1) map.overlayMapTypes.removeAt(idx);
    };
  }, [map, mapType, opacity]);

  return null;
}

/** Click-to-select listener shared by the community and route maps. */
export function MapClickListener({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) onClick(e.latLng.lat(), e.latLng.lng());
    });
    return () => listener.remove();
  }, [map, onClick]);

  return null;
}

/** Smoothly pans (and optionally zooms) the map when its target centre changes. */
export function RecenterOnChange({
  center,
  zoom,
}: {
  center: [number, number] | null;
  zoom?: number;
}) {
  const map = useMap();
  const lat = center?.[0];
  const lng = center?.[1];

  useEffect(() => {
    if (!map || lat == null || lng == null) return;
    map.panTo({ lat, lng });
    if (zoom != null) map.setZoom(zoom);
  }, [map, lat, lng, zoom]);

  return null;
}

/** Floating AQI colour-band legend, shared across all maps. */
export function AqiLegend({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-border/60 bg-card/85 px-2 py-1.5 shadow-md backdrop-blur ${className}`}
    >
      <p className="mb-1 text-[10px] font-medium text-foreground">Air quality</p>
      <div className="flex overflow-hidden rounded-sm">
        {RISK_BANDS.map((b) => (
          <span
            key={b.label}
            className="h-2 w-5"
            style={{ backgroundColor: b.color }}
            title={b.label}
          />
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground">
        <span>Good</span>
        <span>Hazardous</span>
      </div>
    </div>
  );
}
