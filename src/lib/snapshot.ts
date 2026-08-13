import { isAxiosError } from "axios";
import AQISnapshot from "@/models/AQISnapshot";
import { CurrentConditions, getHistoricalDailyAqi } from "@/lib/google-aqi";

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const HISTORY_WINDOW_DAYS = 30;
const SPARSE_THRESHOLD_DAYS = 20; // backfill if we have meaningfully less than a full window

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

/**
 * Opportunistic snapshots alone leave a brand-new location's 7/30-day chart
 * empty for weeks. Google's Air Quality history:lookup covers the past 30
 * days of real hourly data, so we backfill one daily snapshot per missing
 * day instead of waiting for real time to accumulate it. Cheap to call
 * repeatedly — no-ops once a location already has decent coverage.
 */
export async function backfillHistoryIfSparse(locationId: string, lat: number, lng: number) {
  const since = new Date(Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const existing = await AQISnapshot.find({ locationId, timestamp: { $gte: since } })
    .select("timestamp")
    .lean();

  if (existing.length >= SPARSE_THRESHOLD_DAYS) return;

  const existingDays = new Set(existing.map((s) => s.timestamp.toISOString().slice(0, 10)));

  try {
    const days = await getHistoricalDailyAqi(lat, lng, HISTORY_WINDOW_DAYS);
    const toInsert = days
      .filter((d) => !existingDays.has(d.date))
      .map((d) => ({
        locationId,
        timestamp: new Date(`${d.date}T12:00:00.000Z`),
        aqi: d.avgAqi,
        pollutants: d.pollutants,
        source: "google-history",
      }));

    if (toInsert.length > 0) {
      await AQISnapshot.insertMany(toInsert, { ordered: false });
    }
  } catch (err) {
    const detail = isAxiosError(err) ? JSON.stringify(err.response?.data) : String(err);
    console.error("History backfill failed:", detail);
    // Non-fatal — charts just fall back to whatever opportunistic data
    // exists, same as before this feature.
  }
}
