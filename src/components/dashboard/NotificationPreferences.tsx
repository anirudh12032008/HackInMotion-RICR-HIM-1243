"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BellRing } from "lucide-react";

const CATEGORIES = [
  { key: "thresholdAlerts", label: "Threshold alerts", desc: "A saved location crosses your AQI alert threshold." },
  { key: "rapidChange", label: "Rapid change alerts", desc: "Air quality jumps or drops fast at a saved location." },
  { key: "dailySummary", label: "Daily summary", desc: "A once-a-day digest of your worst tracked location." },
  { key: "communityNearby", label: "Community reports nearby", desc: "Someone reports smoke, burning, or industrial emissions near a saved location." },
] as const;

type PreferenceKey = (typeof CATEGORIES)[number]["key"];
type Preferences = Record<PreferenceKey, boolean>;

const DEFAULTS: Preferences = {
  thresholdAlerts: true,
  rapidChange: true,
  dailySummary: true,
  communityNearby: true,
};

/** Push is on by default across every category — this is where a user narrows it, not opts in. */
export function NotificationPreferences() {
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [subscribedDevices, setSubscribedDevices] = useState(0);

  useEffect(() => {
    fetch("/api/user/notifications")
      .then((res) => res.json())
      .then((data) => {
        setPrefs({ ...DEFAULTS, ...data.preferences });
        setSubscribedDevices(data.subscribedDevices ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  async function toggle(key: PreferenceKey, checked: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: checked }));
    const res = await fetch("/api/user/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: checked }),
    });
    if (!res.ok) {
      setPrefs((prev) => ({ ...prev, [key]: !checked }));
      toast.error("Couldn't save that preference.");
    }
  }

  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {subscribedDevices > 0
            ? `Push is on for ${subscribedDevices} device${subscribedDevices === 1 ? "" : "s"}. Turn off any category you don't want.`
            : "Enable push from the bell icon in the top bar to receive these on your lock screen."}
        </p>
        <div className="space-y-3">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="group/field flex items-start gap-3">
              <Checkbox
                id={c.key}
                checked={prefs[c.key]}
                onCheckedChange={(checked) => toggle(c.key, checked === true)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor={c.key} className="text-sm font-medium">
                  {c.label}
                </Label>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
