import Alert from "@/models/Alert";
import AQISnapshot from "@/models/AQISnapshot";
import { classifyRisk } from "@/lib/risk-engine";
import { sendPushToUser } from "@/lib/push";
import { AlertSeverity } from "@/types/index";

const RAPID_CHANGE_THRESHOLD = 50;
const ALERT_COOLDOWN_MS = 3 * 60 * 60 * 1000; // avoid spamming the same alert type

function severityForAqi(aqi: number): AlertSeverity {
  if (aqi > 300) return "emergency";
  if (aqi > 200) return "danger";
  if (aqi > 100) return "warning";
  return "info";
}

async function alreadyAlertedRecently(userId: string, locationId: string, type: string) {
  const recent = await Alert.findOne({
    userId,
    locationId,
    type,
    createdAt: { $gte: new Date(Date.now() - ALERT_COOLDOWN_MS) },
  });
  return Boolean(recent);
}

/**
 * Checks a location's latest AQI reading against the user's threshold and
 * recent history, creating Alert documents for anything newly triggered.
 */
export async function checkAndCreateAlerts({
  userId,
  locationId,
  locationName,
  aqi,
  alertThreshold,
}: {
  userId: string;
  locationId: string;
  locationName: string;
  aqi: number;
  alertThreshold: number;
}) {
  const created = [];

  if (aqi >= alertThreshold && !(await alreadyAlertedRecently(userId, locationId, "threshold_exceeded"))) {
    const alert = await Alert.create({
      userId,
      locationId,
      type: "threshold_exceeded",
      severity: severityForAqi(aqi),
      title: `${locationName}: AQI crossed your threshold`,
      message: `AQI is ${aqi}, above your alert threshold of ${alertThreshold}. ${classifyRisk(aqi).description}`,
      aqiValue: aqi,
    });
    created.push(alert);
    await sendPushToUser(
      userId,
      { title: alert.title, body: alert.message, url: "/dashboard/alerts" },
      "thresholdAlerts"
    );
  }

  const previous = await AQISnapshot.findOne({ locationId }).sort({ timestamp: -1 }).skip(1).lean();
  if (
    previous &&
    Math.abs(aqi - previous.aqi) >= RAPID_CHANGE_THRESHOLD &&
    !(await alreadyAlertedRecently(userId, locationId, "rapid_change"))
  ) {
    const direction = aqi > previous.aqi ? "jumped" : "dropped";
    const alert = await Alert.create({
      userId,
      locationId,
      type: "rapid_change",
      severity: severityForAqi(aqi),
      title: `${locationName}: air quality changed fast`,
      message: `AQI ${direction} from ${previous.aqi} to ${aqi} recently.`,
      aqiValue: aqi,
    });
    created.push(alert);
    await sendPushToUser(
      userId,
      { title: alert.title, body: alert.message, url: "/dashboard/alerts" },
      "rapidChange"
    );
  }

  return created;
}
