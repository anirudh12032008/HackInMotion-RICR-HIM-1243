import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Alert from "@/models/Alert";
import { requireUserId } from "@/lib/session";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Number(searchParams.get("limit")) || 20);
  const severity = searchParams.get("severity");
  const type = searchParams.get("type");
  const locationId = searchParams.get("locationId");

  await connectDB();

  const filter: Record<string, unknown> = { userId };
  if (severity) filter.severity = severity;
  if (type) filter.type = type;
  if (locationId) filter.locationId = locationId;

  const [alerts, total, unreadCount] = await Promise.all([
    Alert.find(filter)
      .populate("locationId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Alert.countDocuments(filter),
    Alert.countDocuments({ userId, read: false }),
  ]);

  return NextResponse.json({ alerts, total, page, limit, unreadCount });
}

export async function PUT(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { markAllRead } = await req.json().catch(() => ({}));
  if (!markAllRead) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await connectDB();
  await Alert.updateMany({ userId, read: false }, { $set: { read: true } });

  return NextResponse.json({ success: true });
}
