import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AQISnapshot from "@/models/AQISnapshot";
import Location from "@/models/Location";
import { requireUserId } from "@/lib/session";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const period = searchParams.get("period") === "30d" ? 30 : 7;

  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  await connectDB();

  const location = await Location.findOne({ _id: locationId, userId });
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
  const snapshots = await AQISnapshot.find({
    locationId,
    timestamp: { $gte: since },
  })
    .sort({ timestamp: 1 })
    .lean();

  return NextResponse.json({ snapshots, period });
}
