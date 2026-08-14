import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CommunityReport from "@/models/CommunityReport";
import Location from "@/models/Location";
import { requireUserId } from "@/lib/session";
import { sendPushToUser } from "@/lib/push";
import { haversineKm } from "@/lib/route-risk";
import { CommunityReportSeverity, CommunityReportType } from "@/types/index";

const TYPE_LABELS: Record<CommunityReportType, string> = {
  smoke: "smoke",
  burning_waste: "waste burning",
  industrial_emission: "an industrial emission",
  dust_storm: "a dust storm",
  chemical_smell: "a chemical smell",
  other: "a pollution incident",
};

const NEARBY_RADIUS_KM = 15;

/**
 * Pushes to anyone (other than the reporter) whose saved location is within
 * range of a fresh community report — the whole point of crowd-sourced
 * reports is that they beat official monitoring stations to it.
 */
async function notifyNearbySavedLocations(report: {
  lat: number;
  lng: number;
  type: CommunityReportType;
  userId: string;
}) {
  const locations = await Location.find({ isActive: true, userId: { $ne: report.userId } })
    .select("userId name lat lng")
    .lean();

  const notifiedUserIds = new Set<string>();
  for (const loc of locations) {
    const userId = loc.userId.toString();
    if (notifiedUserIds.has(userId)) continue;
    const distanceKm = haversineKm({ lat: report.lat, lng: report.lng }, { lat: loc.lat, lng: loc.lng });
    if (distanceKm > NEARBY_RADIUS_KM) continue;

    notifiedUserIds.add(userId);
    await sendPushToUser(
      userId,
      {
        title: `Report near ${loc.name}`,
        body: `Someone flagged ${TYPE_LABELS[report.type]} about ${distanceKm.toFixed(1)}km from ${loc.name}.`,
        url: "/dashboard/community",
      },
      "communityNearby"
    );
  }
}

const VALID_TYPES: CommunityReportType[] = [
  "smoke",
  "burning_waste",
  "industrial_emission",
  "dust_storm",
  "chemical_smell",
  "other",
];
const VALID_SEVERITIES: CommunityReportSeverity[] = ["low", "medium", "high"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusKm = Number(searchParams.get("radius")) || 25;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  await connectDB();
  // Mongoose's own promise for "indexes are actually built" — connectDB()
  // alone doesn't guarantee the 2dsphere index exists yet, and querying
  // before it does throws NoQueryExecutionPlans. Resolves instantly once
  // already built, so this is cheap after the first request.
  await CommunityReport.init();

  const reports = await CommunityReport.find({
    active: true,
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({ reports });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { lat, lng, type, description, severity, userName } = body;

  if (lat === undefined || lng === undefined || !VALID_TYPES.includes(type) || !VALID_SEVERITIES.includes(severity)) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }
  if (description && description.length > 500) {
    return NextResponse.json({ error: "Description must be under 500 characters" }, { status: 400 });
  }

  await connectDB();
  const report = await CommunityReport.create({
    userId,
    userName: userName || "Anonymous",
    lat,
    lng,
    type,
    description,
    severity,
  });

  await notifyNearbySavedLocations({ lat, lng, type, userId });

  return NextResponse.json(report, { status: 201 });
}
