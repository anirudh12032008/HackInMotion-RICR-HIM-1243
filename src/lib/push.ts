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

/**
 * Sends a lock-screen push notification to every browser a user has
 * subscribed from. Silently no-ops if VAPID keys aren't configured, so
 * alert creation never fails because push isn't set up. A subscription
 * that the push service reports as gone (410/404) is pruned so we stop
 * retrying it.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureConfigured()) return;

  const user = await User.findById(userId).select("pushSubscriptions");
  if (!user || user.pushSubscriptions.length === 0) return;

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
