import { classifyRisk } from "@/lib/risk-engine";

export function AQIGauge({ aqi, size = 160 }: { aqi: number; size?: number }) {
  const risk = classifyRisk(aqi);
  const pct = Math.min(aqi / 300, 1);
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted"
          strokeWidth={10}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={risk.color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="font-[family-name:var(--font-display)] text-5xl"
          style={{ color: risk.color }}
        >
          {aqi}
        </span>
        <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">AQI</span>
      </div>
    </div>
  );
}
