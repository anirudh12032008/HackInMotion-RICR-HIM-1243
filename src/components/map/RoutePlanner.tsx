"use client";

import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, CircleMarker, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { classifyRisk } from "@/lib/risk-engine";
import type { RoutePoint, RouteSample } from "@/lib/route-risk";

// Leaflet's default marker icons reference image paths that break under
// bundlers — rebuild them from the CDN so pins actually render.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [28.6139, 77.209]; // New Delhi

function ClickHandler({ onClick }: { onClick: (point: RoutePoint) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
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
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={11}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onClick={onSetPoint} />

      {start && <Marker position={[start.lat, start.lng]} />}
      {end && <Marker position={[end.lat, end.lng]} />}

      {start && end && (
        <Polyline
          positions={[start, end].map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "var(--muted-foreground)", weight: 2, dashArray: "4 6" }}
        />
      )}

      {samples.map((sample, i) => {
        const color = sample.aqi !== null ? classifyRisk(sample.aqi).color : "#94a3b8";
        return (
          <CircleMarker
            key={i}
            center={[sample.lat, sample.lng]}
            radius={6}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 1 }}
          >
            {sample.aqi !== null && <Tooltip>AQI {sample.aqi}</Tooltip>}
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
