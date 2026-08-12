"use client";

import { useState } from "react";
import { Search, Loader2, CalendarCheck, AlertTriangle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/aqi/RiskBadge";
import { classifyRisk } from "@/lib/risk-engine";
import { extractDailyForecast, getBestDay, hasUnhealthyDay, type ForecastDay } from "@/lib/forecast";

export function ForecastBoard() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [days, setDays] = useState<ForecastDay[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadForecast(e?: React.FormEvent) {
    e?.preventDefault();
    const target = query.trim();
    if (!target) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/aqi/current?city=${encodeURIComponent(target)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Location not found");
      setDays(extractDailyForecast(data.forecast));
      setCity(data.city.name.split(",")[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setDays(null);
    } finally {
      setLoading(false);
    }
  }

  const bestDay = days ? getBestDay(days) : null;
  const unhealthyAhead = days ? hasUnhealthyDay(days) : false;

  return (
    <div className="space-y-6">
      <form onSubmit={loadForecast} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a city for its forecast..."
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get forecast"}
        </Button>
      </form>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && <Skeleton className="h-64 rounded-xl" />}

      {!loading && days && days.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          No forecast data available for {city}.
        </div>
      )}

      {!loading && days && days.length > 0 && (
        <div className="space-y-6">
          {unhealthyAhead && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Unhealthy air expected this week</AlertTitle>
              <AlertDescription>
                At least one day in {city}&apos;s forecast crosses into unhealthy territory. Plan
                indoor alternatives.
              </AlertDescription>
            </Alert>
          )}

          {bestDay && (
            <Alert>
              <CalendarCheck className="h-4 w-4" />
              <AlertTitle>Best day for outdoor activity</AlertTitle>
              <AlertDescription>
                {formatWeekday(bestDay.date)} looks best in {city}, with an estimated AQI of{" "}
                {Math.round(bestDay.avg)}.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {days.map((d) => {
              const risk = classifyRisk(d.avg);
              return (
                <Card key={d.date}>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs font-medium text-muted-foreground">
                      {formatWeekday(d.date)}
                    </p>
                    <p
                      className="mt-2 font-[family-name:var(--font-display)] text-3xl"
                      style={{ color: risk.color }}
                    >
                      {Math.round(d.avg)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(d.min)}–{Math.round(d.max)}
                    </p>
                    <RiskBadge aqi={d.avg} className="mt-2" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={days} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatWeekday}
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
                    formatter={(value) => Math.round(Number(value))}
                    labelFormatter={(label) => formatWeekday(String(label))}
                  />
                  <Line type="monotone" dataKey="avg" stroke="var(--primary)" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function formatWeekday(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
