import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CommunityReport from "@/models/CommunityReport";
import { requireUserId } from "@/lib/session";
import { CommunityReportSeverity, CommunityReportType } from "@/types/index";

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

  return NextResponse.json(report, { status: 201 });
}
