import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Location from "@/models/Location";
import { requireUserId } from "@/lib/session";
import { getCurrentAQIByCoords } from "@/lib/waqi";
import { checkAndCreateAlerts } from "@/lib/alerts";

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { locationId } = await req.json();
  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  await connectDB();
  const location = await Location.findOne({ _id: locationId, userId });
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const feed = await getCurrentAQIByCoords(location.lat, location.lng);
  const created = await checkAndCreateAlerts({
    userId,
    locationId,
    locationName: location.name,
    aqi: feed.aqi,
    alertThreshold: location.alertThreshold,
  });

  return NextResponse.json({ alerts: created });
}
