import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Location from "@/models/Location";
import { requireUserId } from "@/lib/session";
import { getCurrentConditions } from "@/lib/google-aqi";
import { classifyRisk } from "@/lib/risk-engine";
import { maybeStoreSnapshot, backfillHistoryIfSparse } from "@/lib/snapshot";
import { checkAndCreateAlerts } from "@/lib/alerts";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const locations = await Location.find({ userId, isActive: true }).sort({ createdAt: -1 }).lean();

  const withAqi = await Promise.all(
    locations.map(async (loc) => {
      try {
        const conditions = await getCurrentConditions(loc.lat, loc.lng);
        const locationId = loc._id.toString();
        await maybeStoreSnapshot(locationId, conditions);
        await backfillHistoryIfSparse(locationId, loc.lat, loc.lng);
        await checkAndCreateAlerts({
          userId,
          locationId,
          locationName: loc.name,
          aqi: conditions.aqi,
          alertThreshold: loc.alertThreshold,
        });
        return {
          ...loc,
          _id: loc._id.toString(),
          userId: loc.userId.toString(),
          currentAqi: conditions.aqi,
          dominantPollutant: conditions.dominantPollutant,
          pollutants: conditions.pollutants,
          risk: classifyRisk(conditions.aqi),
          updatedAt: conditions.timestamp,
        };
      } catch {
        return {
          ...loc,
          _id: loc._id.toString(),
          userId: loc.userId.toString(),
          currentAqi: null,
          error: "Unable to fetch current AQI",
        };
      }
    })
  );

  return NextResponse.json({ locations: withAqi });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, city, lat, lng, alertThreshold } = await req.json();

  if (!name || lat === undefined || lng === undefined) {
    return NextResponse.json({ error: "name, lat, and lng are required" }, { status: 400 });
  }

  await connectDB();
  const location = await Location.create({
    userId,
    name,
    city,
    lat,
    lng,
    alertThreshold: alertThreshold ?? 100,
  });

  return NextResponse.json(location, { status: 201 });
}
