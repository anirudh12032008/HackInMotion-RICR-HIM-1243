"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Legend,
} from "recharts";
import { classifyRisk } from "@/lib/risk-engine";
import type { Pollutants } from "@/types/index";

export interface ComparisonEntry {
  key: string;
  name: string;
  aqi: number;
  dominantPollutant: string;
  pollutants: Pollutants;
}

const SERIES_COLORS = ["#1f5f4e", "#b3432f", "#8b5cf6", "#eab308"];

const POLLUTANT_AXES: { key: keyof Pollutants; label: string }[] = [
  { key: "pm25", label: "PM2.5" },
  { key: "pm10", label: "PM10" },
  { key: "o3", label: "O3" },
  { key: "no2", label: "NO2" },
  { key: "so2", label: "SO2" },
  { key: "co", label: "CO" },
];

export function AqiBarChart({ entries }: { entries: ComparisonEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={entries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="name"
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
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const entry = payload[0].payload as ComparisonEntry;
            const risk = classifyRisk(entry.aqi);
            return (
              <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
                <p className="font-medium">{entry.name}</p>
                <p style={{ color: risk.color }}>
                  AQI {entry.aqi} · {risk.label}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="aqi" radius={[4, 4, 0, 0]}>
          {entries.map((e) => (
            <Cell key={e.key} fill={classifyRisk(e.aqi).color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PollutantRadarChart({ entries }: { entries: ComparisonEntry[] }) {
  // Pollutants sit on wildly different scales  CO readings (often 500-1000+
  // µg/m³) are 10-50x every other axis (typically 0-200), so plotting raw
  // concentrations on one shared radial scale collapses every axis but CO
  // to the center. Normalize each axis independently to a 0-100 percent of
  // whichever compared location is worst for that pollutant, so the shape
  // is actually readable; the tooltip still shows the real concentration.
  const data = POLLUTANT_AXES.map((axis) => {
    const row: Record<string, string | number> = { pollutant: axis.label };
    const rawValues = entries.map((e) => e.pollutants[axis.key] ?? 0);
    const max = Math.max(...rawValues, 1);
    entries.forEach((entry, i) => {
      row[entry.name] = Math.round((rawValues[i] / max) * 100);
      row[`${entry.name}__raw`] = rawValues[i];
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid className="stroke-border" />
        <PolarAngleAxis dataKey="pollutant" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
                <p className="font-medium">{label}</p>
                {payload.map((p) => {
                  const raw = (p.payload as Record<string, number>)?.[`${p.name}__raw`];
                  return (
                    <p key={String(p.name)} style={{ color: p.color }}>
                      {p.name}: {raw ?? p.value} µg/m³
                    </p>
                  );
                })}
              </div>
            );
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {entries.map((entry, i) => (
          <Radar
            key={entry.key}
            name={entry.name}
            dataKey={entry.name}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
            fillOpacity={0.15}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}
