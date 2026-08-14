"use client";

import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import type { CommunityReportType } from "@/types/index";
import {
  MAPS_KEY,
  MAP_ID,
  useMapColorScheme,
  AqiHeatmapOverlay,
  MapClickListener,
  RecenterOnChange,
  AqiLegend,
} from "@/components/map/shared";

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

const SEVERITY_SIZE: Record<CommunityReportPoint["severity"], number> = {
  high: 22,
  medium: 18,
  low: 15,
};

export function CommunityMap({
  center,
  reports,
  onMapClick,
  activeId = null,
  onActiveChange,
}: {
  center: [number, number];
  reports: CommunityReportPoint[];
  onMapClick?: (lat: number, lng: number) => void;
  /** Selected report id — lets the page's list and the map share a highlight. */
  activeId?: string | null;
  onActiveChange?: (id: string | null) => void;
}) {
  const colorScheme = useMapColorScheme();

  if (!MAPS_KEY) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      </div>
    );
  }

  const active = reports.find((r) => r._id === activeId) ?? null;

  return (
    <APIProvider apiKey={MAPS_KEY}>
      <div className="relative h-full w-full">
        <Map
          mapId={MAP_ID}
          colorScheme={colorScheme}
          defaultCenter={{ lat: center[0], lng: center[1] }}
          defaultZoom={12}
          gestureHandling="greedy"
          clickableIcons={false}
          style={{ width: "100%", height: "100%" }}
        >
          <AqiHeatmapOverlay opacity={0.4} />
          {onMapClick && <MapClickListener onClick={onMapClick} />}
          {active && <RecenterOnChange center={[active.lat, active.lng]} />}

          {reports.map((report) => (
            <AdvancedMarker
              key={report._id}
              position={{ lat: report.lat, lng: report.lng }}
              zIndex={report._id === activeId ? 20 : 1}
              onClick={() => onActiveChange?.(report._id)}
            >
              <ReportPin
                color={TYPE_COLORS[report.type]}
                size={SEVERITY_SIZE[report.severity]}
                active={report._id === activeId}
              />
            </AdvancedMarker>
          ))}

          {active && (
            <InfoWindow
              position={{ lat: active.lat, lng: active.lng }}
              onCloseClick={() => onActiveChange?.(null)}
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

        <AqiLegend />
      </div>
    </APIProvider>
  );
}

/** Colored report dot: sized by severity, with a pulsing ring when selected. */
function ReportPin({ color, size, active }: { color: string; size: number; active: boolean }) {
  const dim = active ? size + 6 : size;
  return (
    <span className="relative flex items-center justify-center">
      {active && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
          style={{ backgroundColor: color }}
        />
      )}
      <span
        className="rounded-full border-2 border-white shadow-md transition-all dark:border-white/80"
        style={{ width: dim, height: dim, backgroundColor: color }}
      />
    </span>
  );
}

export { TYPE_COLORS, TYPE_LABELS };
