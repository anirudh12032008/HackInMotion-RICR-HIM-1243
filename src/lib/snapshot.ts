import AQISnapshot from "@/models/AQISnapshot";
import { WaqiFeedData, extractPollutants } from "@/lib/waqi";

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Stores a snapshot for a location if the last one is stale (or missing),
 * so history/trend charts have data without a dedicated cron job.
 */
export async function maybeStoreSnapshot(locationId: string, feed: WaqiFeedData) {
  const latest = await AQISnapshot.findOne({ locationId }).sort({ timestamp: -1 }).lean();

  if (latest && Date.now() - new Date(latest.timestamp).getTime() < SNAPSHOT_INTERVAL_MS) {
    return;
  }

  const dailyForecast = feed.forecast?.daily?.pm25 ?? [];

  await AQISnapshot.create({
    locationId,
    timestamp: new Date(),
    aqi: feed.aqi,
    dominantPollutant: feed.dominentpol,
    pollutants: extractPollutants(feed.iaqi),
    forecast: dailyForecast.map((d) => ({
      day: new Date(d.day),
      avg: d.avg,
      min: d.min,
      max: d.max,
    })),
    source: "waqi",
  });
}
