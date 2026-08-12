import { Pollutants } from "@/types/index";

const LABELS: Record<keyof Pollutants, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
  o3: "O3",
  no2: "NO2",
  so2: "SO2",
  co: "CO",
};

export function PollutantBreakdown({ pollutants }: { pollutants: Pollutants }) {
  const entries = (Object.keys(LABELS) as (keyof Pollutants)[])
    .filter((k) => pollutants[k] !== undefined)
    .map((k) => ({ key: k, label: LABELS[k], value: pollutants[k] as number }));

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No pollutant data available.</p>;
  }

  const max = Math.max(...entries.map((e) => e.value), 1);

  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <div key={e.key}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">{e.label}</span>
            <span className="text-muted-foreground">{e.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max((e.value / max) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
