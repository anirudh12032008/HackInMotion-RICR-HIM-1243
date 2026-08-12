"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
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

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
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
  return (
    <MapContainer center={center} zoom={12} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onMapClick && <ClickHandler onClick={onMapClick} />}

      {reports.map((report) => (
        <CircleMarker
          key={report._id}
          center={[report.lat, report.lng]}
          radius={report.severity === "high" ? 10 : report.severity === "medium" ? 8 : 6}
          pathOptions={{
            color: TYPE_COLORS[report.type],
            fillColor: TYPE_COLORS[report.type],
            fillOpacity: 0.7,
            weight: 2,
          }}
        >
          <Popup>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{TYPE_LABELS[report.type]}</p>
              {report.description && <p className="text-muted-foreground">{report.description}</p>}
              <p className="text-xs text-muted-foreground">
                {report.severity} severity · {report.upvotes.length} upvotes
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(report.createdAt).toLocaleString()}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

export { TYPE_COLORS, TYPE_LABELS };
