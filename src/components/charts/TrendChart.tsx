"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  CartesianGrid,
} from "recharts";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { classifyRisk } from "@/lib/risk-engine";

interface Snapshot {
  timestamp: string;
  aqi: number;
  pollutants?: Record<string, number | undefined>;
}

const BANDS = [
  { from: 0, to: 50, color: "#22c55e" },
  { from: 50, to: 100, color: "#eab308" },
  { from: 100, to: 150, color: "#f97316" },
  { from: 150, to: 200, color: "#ef4444" },
  { from: 200, to: 300, color: "#8b5cf6" },
];

function TooltipContent({ active, payload }: { active?: boolean; payload?: { payload: Snapshot }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const risk = classifyRisk(point.aqi);

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="font-medium">{new Date(point.timestamp).toLocaleString()}</p>
      <p style={{ color: risk.color }}>
        AQI {point.aqi} · {risk.label}
      </p>
      {point.pollutants?.pm25 !== undefined && (
        <p className="text-muted-foreground">PM2.5 {point.pollutants.pm25}</p>
      )}
    </div>
  );
}

export function TrendChart({ locationId }: { locationId: string }) {
  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/aqi/history?locationId=${locationId}&period=${period}`)
      .then((res) => res.json())
      .then((data) => setSnapshots(data.snapshots ?? []))
      .finally(() => setLoading(false));
  }, [locationId, period]);

  const trend = useMemo(() => {
    if (!snapshots || snapshots.length < 2) return null;
    const mid = Math.floor(snapshots.length / 2);
    const firstHalfAvg = avg(snapshots.slice(0, mid).map((s) => s.aqi));
    const secondHalfAvg = avg(snapshots.slice(mid).map((s) => s.aqi));
    const delta = secondHalfAvg - firstHalfAvg;
    if (Math.abs(delta) < 3) return { direction: "stable" as const, delta };
    return { direction: delta > 0 ? ("worsening" as const) : ("improving" as const), delta };
  }, [snapshots]);

  const maxAqi = snapshots?.length ? Math.max(...snapshots.map((s) => s.aqi), 60) : 60;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "7d" | "30d")}>
          <TabsList>
            <TabsTrigger value="7d">7 days</TabsTrigger>
            <TabsTrigger value="30d">30 days</TabsTrigger>
          </TabsList>
        </Tabs>
        {trend && <TrendIndicator direction={trend.direction} />}
      </div>

      {loading ? (
        <Skeleton className="h-56 w-full rounded-lg" />
      ) : !snapshots || snapshots.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Tracking started — check back later for trends.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={224}>
          <LineChart data={snapshots} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            {BANDS.filter((b) => b.from < maxAqi + 20).map((b) => (
              <ReferenceArea
                key={b.from}
                y1={b.from}
                y2={Math.min(b.to, maxAqi + 20)}
                fill={b.color}
                fillOpacity={0.06}
                strokeOpacity={0}
              />
            ))}
            <XAxis
              dataKey="timestamp"
              tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<TooltipContent />} />
            <Line
              type="monotone"
              dataKey="aqi"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function avg(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
}

function TrendIndicator({ direction }: { direction: "improving" | "worsening" | "stable" }) {
  const config = {
    improving: { icon: ArrowDown, label: "Improving", color: "text-green-600" },
    worsening: { icon: ArrowUp, label: "Worsening", color: "text-red-600" },
    stable: { icon: ArrowRight, label: "Stable", color: "text-muted-foreground" },
  }[direction];

  const Icon = config.icon;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${config.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
