import { classifyRisk } from "@/lib/risk-engine";
import { AqiScale } from "@/components/aqi/AqiScale";

/**
 * The headline reading. Sized like an instrument display: the number carries
 * the weight, the band scale underneath supplies the context, and colour is
 * only ever the AQI band colour.
 */
export function AQIGauge({ aqi }: { aqi: number }) {
  const risk = classifyRisk(aqi);

  return (
    <div className="w-full">
      <div className="flex items-baseline gap-3">
        <span
          className="font-[family-name:var(--font-display)] text-6xl font-bold leading-none tabular-nums sm:text-7xl"
          style={{ color: risk.color }}
        >
          {aqi}
        </span>
        <div className="flex flex-col">
          <span className="font-[family-name:var(--font-display)] text-xs uppercase tracking-[0.2em] text-muted-foreground">
            AQI
          </span>
          <span className="text-sm font-medium" style={{ color: risk.color }}>
            {risk.label}
          </span>
        </div>
      </div>

      <AqiScale aqi={aqi} className="mt-5" />
    </div>
  );
}
