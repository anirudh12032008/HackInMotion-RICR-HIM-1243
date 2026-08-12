"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map, Marker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { CommunityReportType } from "@/types/index";

export interface CommunityReportPoint {
  _id: string;
  lat: number;
  lng: number;
  type: CommunityReportType;
  severity: "low" | "medium" | "high";
  description?: string;
  userName: string;
  upvotes: string[];
  createdAt: string;
}

const TYPE_COLORS: Record<CommunityReportType, string> = {
  smoke: "#6b7280",
  burning_waste: "#b3432f",
  industrial_emission: "#8b5cf6",
  dust_storm: "#eab308",
  chemical_smell: "#22c55e",
  other: "#3b82f6",
};

const TYPE_LABELS: Record<CommunityReportType, string> = {
  smoke: "Smoke",
  burning_waste: "Burning waste",
  industrial_emission: "Industrial emission",
  dust_storm: "Dust storm",
  chemical_smell: "Chemical smell",
  other: "Other",
};

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

function AqiHeatmapOverlay() {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google) return;

    const overlay = new window.google.maps.ImageMapType({
      getTileUrl: (coord, zoom) => `/api/aqi/heatmap-tile/UAQI_RED_GREEN/${zoom}/${coord.x}/${coord.y}`,
      tileSize: new window.google.maps.Size(256, 256),
      opacity: 0.4,
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

function ClickListener({ onClick }: { onClick: (lat: number, lng: number) => void }) {
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

export function CommunityMap({
  center,
  reports,
  onMapClick,
}: {
  center: [number, number];
  reports: CommunityReportPoint[];
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  if (!MAPS_KEY) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      </div>
    );
  }

  const active = reports.find((r) => r._id === activeId);

  return (
    <APIProvider apiKey={MAPS_KEY}>
      <Map
        defaultCenter={{ lat: center[0], lng: center[1] }}
        defaultZoom={12}
        gestureHandling="greedy"
        style={{ width: "100%", height: "100%" }}
      >
        <AqiHeatmapOverlay />
        {onMapClick && <ClickListener onClick={onMapClick} />}

        {reports.map((report) => (
          <Marker
            key={report._id}
            position={{ lat: report.lat, lng: report.lng }}
            onClick={() => setActiveId(report._id)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: report.severity === "high" ? 10 : report.severity === "medium" ? 8 : 6,
              fillColor: TYPE_COLORS[report.type],
              fillOpacity: 0.8,
              strokeColor: TYPE_COLORS[report.type],
              strokeWeight: 2,
            }}
          />
        ))}

        {active && (
          <InfoWindow
            position={{ lat: active.lat, lng: active.lng }}
            onCloseClick={() => setActiveId(null)}
          >
            <div className="space-y-1 text-sm">
              <p className="font-medium">{TYPE_LABELS[active.type]}</p>
              {active.description && <p className="text-muted-foreground">{active.description}</p>}
              <p className="text-xs text-muted-foreground">
                {active.severity} severity · {active.upvotes.length} upvotes
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(active.createdAt).toLocaleString()}
              </p>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}

export { TYPE_COLORS, TYPE_LABELS };
