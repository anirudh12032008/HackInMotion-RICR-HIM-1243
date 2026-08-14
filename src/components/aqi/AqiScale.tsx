import { classifyRisk, RISK_BANDS } from "@/lib/risk-engine";
import { cn } from "@/lib/utils";

/**
 * The app's signature readout: the six EPA bands as a labelled strip with a
 * precision marker on the current value.
 *
 * This replaced a donut gauge that filled to `aqi / 300`, which implied AQI is
 * a smooth 0-300 continuum. It isn't — it's a banded scale where 150 and 151
 * carry different guidance, and where the top band runs to 500. Showing the
 * bands themselves means the reading is always in context: you see not just
 * where you are but what's on either side of you.
 *
 * Bands are drawn equal-width rather than proportional to their numeric range
 * (the hazardous band alone spans 301-500, 40% of the axis) so every band stays
 * legible; the boundary numbers underneath keep the real scale explicit. The
 * marker interpolates *within* its band, so 110 sits a fifth of the way across
 * "Unhealthy for Sensitive Groups", not at an arbitrary point.
 */

const BAND_BOUNDS = [
  { min: 0, max: 50 },
  { min: 51, max: 100 },
  { min: 101, max: 150 },
  { min: 151, max: 200 },
  { min: 201, max: 300 },
  { min: 301, max: 500 },
];

function markerPosition(aqi: number): number {
  const bandWidth = 100 / BAND_BOUNDS.length;
  const index = BAND_BOUNDS.findIndex((b) => aqi <= b.max);
  if (index === -1) return 100;

  const band = BAND_BOUNDS[index];
  const span = band.max - band.min || 1;
  const withinBand = Math.min(1, Math.max(0, (aqi - band.min) / span));
  return index * bandWidth + withinBand * bandWidth;
}

export function AqiScale({
  aqi,
  showLabels = true,
  className,
}: {
  aqi: number;
  showLabels?: boolean;
  className?: string;
}) {
  const risk = classifyRisk(aqi);
  const left = markerPosition(aqi);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        <div className="flex h-2 w-full overflow-hidden rounded-sm">
          {RISK_BANDS.map((band) => (
            <div
              key={band.label}
              className="flex-1 transition-opacity"
              style={{
                backgroundColor: band.color,
                // The active band stays fully saturated; the rest recede so the
                // eye lands on the reading, not the legend.
                opacity: band.label === risk.label ? 1 : 0.28,
              }}
            />
          ))}
        </div>

        <div
          className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-foreground ring-2 ring-background transition-[left] duration-500"
          style={{ left: `${left}%` }}
          aria-hidden
        />
      </div>

      {showLabels && (
        <div className="mt-1.5 flex justify-between font-[family-name:var(--font-display)] text-[10px] tabular-nums text-muted-foreground">
          <span>0</span>
          <span>50</span>
          <span>100</span>
          <span>150</span>
          <span>200</span>
          <span>300</span>
          <span>500</span>
        </div>
      )}
    </div>
  );
}
