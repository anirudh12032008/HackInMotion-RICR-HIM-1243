import webpush from "web-push";
import User from "@/models/User";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT;

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  if (!PUBLIC_KEY || !PRIVATE_KEY || !SUBJECT) return false;
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export type NotificationCategory =
  | "thresholdAlerts"
  | "rapidChange"
  | "dailySummary"
  | "communityNearby";

/**
 * Sends a lock-screen push notification to every browser a user has
 * subscribed from. Silently no-ops if VAPID keys aren't configured, so
 * alert creation never fails because push isn't set up. A subscription
 * that the push service reports as gone (410/404) is pruned so we stop
 * retrying it. `category` is checked against the user's per-category
 * notification preferences  opt-out, not opt-in, so an unset preference
 * (older users, or a category added after they signed up) reads as "on".
 */
export async function sendPushToUser(userId: string, payload: PushPayload, category: NotificationCategory) {
  if (!ensureConfigured()) return;

  const user = await User.findById(userId).select("pushSubscriptions notificationPreferences");
  if (!user || user.pushSubscriptions.length === 0) return;
  if (user.notificationPreferences?.[category] === false) return;

  const stale: string[] = [];

  await Promise.all(
    user.pushSubscriptions.map(async (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) stale.push(sub.endpoint);
      }
    })
  );

  if (stale.length > 0) {
    await User.findByIdAndUpdate(userId, {
      $pull: { pushSubscriptions: { endpoint: { $in: stale } } },
    });
  }
}

const SUMMARY_INTERVAL_MS = 20 * 60 * 60 * 1000; // ~once/day, tolerant of irregular visit times

/**
 * Sends a once-a-day digest across a user's saved locations, throttled by
 * `lastSummaryPushAt`  the same opportunistic pattern AQISnapshot uses for
 * hourly snapshots (see lib/snapshot.ts), so it needs no cron job.
 */
export async function maybeSendDailySummary(
  userId: string,
  locations: { name: string; currentAqi: number | null; riskLabel: string | null }[]
) {
  const reportable = locations.filter((l) => l.currentAqi !== null);
  if (reportable.length === 0) return;

  const user = await User.findById(userId).select("pushSubscriptions notificationPreferences lastSummaryPushAt");
  if (!user || user.pushSubscriptions.length === 0) return;
  if (user.notificationPreferences?.dailySummary === false) return;
  if (user.lastSummaryPushAt && Date.now() - new Date(user.lastSummaryPushAt).getTime() < SUMMARY_INTERVAL_MS) {
    return;
  }

  const worst = reportable.reduce((a, b) => ((b.currentAqi ?? 0) > (a.currentAqi ?? 0) ? b : a));
  const body =
    reportable.length === 1
      ? `${worst.name} is at AQI ${worst.currentAqi} (${worst.riskLabel}).`
      : `${worst.name} is your worst tracked spot today  AQI ${worst.currentAqi} (${worst.riskLabel}). ${reportable.length - 1} other location${reportable.length - 1 === 1 ? "" : "s"} tracked.`;

  await sendPushToUser(userId, { title: "Today's air quality", body, url: "/dashboard" }, "dailySummary");
  await User.findByIdAndUpdate(userId, { lastSummaryPushAt: new Date() });
}
