"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Bell, CheckCheck, Info, ShieldAlert, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertSeverity, AlertType } from "@/types/index";
import { useTranslation } from "@/lib/i18n";

interface AlertItem {
  _id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  aqiValue: number;
  read: boolean;
  createdAt: string;
  locationId?: { name?: string };
}

const SEVERITY_ICON: Record<AlertSeverity, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  danger: ShieldAlert,
  emergency: Siren,
};

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  info: "#3b82f6",
  warning: "#eab308",
  danger: "#ef4444",
  emergency: "#991b1b",
};

export function AlertsFeed() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<AlertItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (severityFilter !== "all") params.set("severity", severityFilter);
    const res = await fetch(`/api/alerts?${params.toString()}`);
    const data = await res.json();
    setAlerts(data.alerts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severityFilter]);

  async function markRead(id: string) {
    setAlerts((prev) => prev?.map((a) => (a._id === id ? { ...a, read: true } : a)) ?? null);
    await fetch(`/api/alerts/${id}/read`, { method: "PUT" });
  }

  async function markAllRead() {
    setAlerts((prev) => prev?.map((a) => ({ ...a, read: true })) ?? null);
    const res = await fetch("/api/alerts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    if (res.ok) toast.success("All alerts marked as read");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v ?? "all")}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="danger">Danger</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={markAllRead}>
          <CheckCheck className="mr-1.5 h-4 w-4" />
          {t("alertsPage.markAllRead")}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : !alerts || alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
          <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">{t("alertsPage.noAlerts")}</p>
          <p className="text-sm text-muted-foreground">
            We&apos;ll notify you when air quality crosses your thresholds.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => {
            const Icon = SEVERITY_ICON[a.severity];
            return (
              <li
                key={a._id}
                className={`flex items-start gap-3 rounded-lg border p-4 ${a.read ? "opacity-60" : ""}`}
              >
                <Icon
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: SEVERITY_COLOR[a.severity] }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{a.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                  {a.locationId?.name && (
                    <p className="mt-1 text-xs text-muted-foreground">{a.locationId.name}</p>
                  )}
                </div>
                {!a.read && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markRead(a._id)}>
                    {t("alertsPage.markRead")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
