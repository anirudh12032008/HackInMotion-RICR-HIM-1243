"use client";

import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { classifyRisk } from "@/lib/risk-engine";
import { MAPS_KEY, MAP_ID, useMapColorScheme, AqiHeatmapOverlay } from "@/components/map/shared";

/** Small decorative live AQI map shown next to a landing-page search result. */
export function LandingMapPreview({ lat, lng, aqi }: { lat: number; lng: number; aqi: number }) {
  const colorScheme = useMapColorScheme();
  const color = classifyRisk(aqi).color;

  if (!MAPS_KEY) return null;

  return (
    <div className="mt-4 h-40 overflow-hidden rounded-lg border border-border">
      <APIProvider apiKey={MAPS_KEY}>
        <Map
          mapId={MAP_ID}
          colorScheme={colorScheme}
          center={{ lat, lng }}
          defaultZoom={9}
          gestureHandling="cooperative"
          disableDefaultUI
          clickableIcons={false}
          style={{ width: "100%", height: "100%" }}
        >
          <AqiHeatmapOverlay opacity={0.5} />
          <AdvancedMarker position={{ lat, lng }}>
            <span
              className="block h-3.5 w-3.5 rounded-full border-2 border-white shadow-md dark:border-white/80"
              style={{ backgroundColor: color }}
            />
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
}
