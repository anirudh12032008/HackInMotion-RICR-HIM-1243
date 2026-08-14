import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { requireUserId } from "@/lib/session";

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint, keys } = await req.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await connectDB();
  // Replace any existing subscription with the same endpoint (browser
  // resubscribing with fresh keys) before adding it back.
  await User.findByIdAndUpdate(userId, {
    $pull: { pushSubscriptions: { endpoint } },
  });
  await User.findByIdAndUpdate(userId, {
    $push: { pushSubscriptions: { endpoint, keys } },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "endpoint is required" }, { status: 400 });

  await connectDB();
  await User.findByIdAndUpdate(userId, { $pull: { pushSubscriptions: { endpoint } } });

  return NextResponse.json({ success: true });
}
