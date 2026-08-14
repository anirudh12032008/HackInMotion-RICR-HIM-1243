import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { requireUserId } from "@/lib/session";

const VALID_KEYS = ["thresholdAlerts", "rapidChange", "dailySummary", "communityNearby"] as const;
type PreferenceKey = (typeof VALID_KEYS)[number];

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findById(userId).select("notificationPreferences pushSubscriptions");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    preferences: user.notificationPreferences,
    subscribedDevices: user.pushSubscriptions.length,
  });
}

export async function PUT(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, boolean> = {};
  for (const key of VALID_KEYS) {
    if (typeof body[key as PreferenceKey] === "boolean") {
      updates[`notificationPreferences.${key}`] = body[key as PreferenceKey];
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid preferences provided" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select(
    "notificationPreferences"
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ preferences: user.notificationPreferences });
}
