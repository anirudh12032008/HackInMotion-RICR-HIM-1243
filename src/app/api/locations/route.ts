import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Location from "@/models/Location";
import { requireUserId } from "@/lib/session";
import { getCurrentAQIByCoords, extractPollutants } from "@/lib/waqi";
import { classifyRisk } from "@/lib/risk-engine";
import { maybeStoreSnapshot } from "@/lib/snapshot";
import { checkAndCreateAlerts } from "@/lib/alerts";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const locations = await Location.find({ userId, isActive: true }).sort({ createdAt: -1 }).lean();

  const withAqi = await Promise.all(
    locations.map(async (loc) => {
      try {
        const feed = await getCurrentAQIByCoords(loc.lat, loc.lng);
        const locationId = loc._id.toString();
        await maybeStoreSnapshot(locationId, feed);
        await checkAndCreateAlerts({
          userId,
          locationId,
          locationName: loc.name,
          aqi: feed.aqi,
          alertThreshold: loc.alertThreshold,
        });
        return {
          ...loc,
          _id: loc._id.toString(),
          userId: loc.userId.toString(),
          currentAqi: feed.aqi,
          dominantPollutant: feed.dominentpol,
          pollutants: extractPollutants(feed.iaqi),
          risk: classifyRisk(feed.aqi),
          updatedAt: feed.time.s,
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
