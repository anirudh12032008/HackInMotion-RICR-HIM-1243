import AQISnapshot from "@/models/AQISnapshot";
import { CurrentConditions } from "@/lib/google-aqi";

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Stores a snapshot for a location if the last one is stale (or missing),
 * so history/trend charts have data without a dedicated cron job.
 */
export async function maybeStoreSnapshot(locationId: string, conditions: CurrentConditions) {
  const latest = await AQISnapshot.findOne({ locationId }).sort({ timestamp: -1 }).lean();

  if (latest && Date.now() - new Date(latest.timestamp).getTime() < SNAPSHOT_INTERVAL_MS) {
    return;
  }

  await AQISnapshot.create({
    locationId,
    timestamp: new Date(),
    aqi: conditions.aqi,
    dominantPollutant: conditions.dominantPollutant,
    pollutants: conditions.pollutants,
    source: "google",
  });
}
