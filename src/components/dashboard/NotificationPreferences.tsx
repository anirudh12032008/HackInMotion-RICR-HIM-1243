"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BellRing, BellOff } from "lucide-react";
import {
  isPushSupported,
  getPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-client";

const CATEGORIES = [
  {
    key: "thresholdAlerts",
    label: "Threshold alerts",
    desc: "A saved location crosses your AQI alert threshold.",
  },
  {
    key: "rapidChange",
    label: "Rapid change alerts",
    desc: "Air quality jumps or drops fast at a saved location.",
  },
  {
    key: "dailySummary",
    label: "Daily summary",
    desc: "A once-a-day digest of your worst tracked location.",
  },
  {
    key: "communityNearby",
    label: "Community reports nearby",
    desc: "Someone reports smoke, burning, or industrial emissions near a saved location.",
  },
] as const;

type PreferenceKey = (typeof CATEGORIES)[number]["key"];
type Preferences = Record<PreferenceKey, boolean>;

const DEFAULTS: Preferences = {
  thresholdAlerts: true,
  rapidChange: true,
  dailySummary: true,
  communityNearby: true,
};

/**
 * Push is on by default the moment a user saves their first location (see
 * AQICard)  this card is where they narrow it (per category) or turn the
 * whole thing off for this device, not where they opt in from scratch.
 */
export function NotificationPreferences() {
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [subscribedDevices, setSubscribedDevices] = useState(0);
  const [subscribedHere, setSubscribedHere] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    fetch("/api/user/notifications")
      .then((res) => res.json())
      .then((data) => {
        setPrefs({ ...DEFAULTS, ...data.preferences });
        setSubscribedDevices(data.subscribedDevices ?? 0);
      })
      .finally(() => setLoading(false));

    if (isPushSupported()) {
      getPushSubscription().then((sub) => setSubscribedHere(Boolean(sub)));
    }
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

  async function togglePush() {
    setPushBusy(true);
    try {
      if (subscribedHere) {
        await unsubscribeFromPush();
        setSubscribedHere(false);
        setSubscribedDevices((n) => Math.max(0, n - 1));
        toast.success("Push notifications turned off for this device.");
      } else {
        const ok = await subscribeToPush();
        if (!ok) {
          toast.error("Notifications were blocked  enable them in your browser's site settings.");
          return;
        }
        setSubscribedHere(true);
        setSubscribedDevices((n) => n + 1);
        toast.success("Push notifications turned on for this device.");
      }
    } catch {
      toast.error("Couldn't update push notifications.");
    } finally {
      setPushBusy(false);
    }
  }

  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4" />
          Notifications
        </CardTitle>
        {isPushSupported() && (
          <Button variant="outline" size="sm" disabled={pushBusy} onClick={togglePush}>
            {subscribedHere ? (
              <>
                <BellOff className="mr-1.5 h-3.5 w-3.5" />
                Disable push
              </>
            ) : (
              <>
                <BellRing className="mr-1.5 h-3.5 w-3.5" />
                Enable push
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {subscribedDevices > 0
            ? `Push is on for ${subscribedDevices} device${subscribedDevices === 1 ? "" : "s"}. Turn off any category you don't want, or disable push entirely above.`
            : "Push turns on automatically the first time you save a location. Turn it on above if you'd like it now."}
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
