import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Location from "@/models/Location";
import { requireUserId } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const location = await Location.findOneAndDelete({ _id: params.id, userId });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.alertThreshold === "number") updates.alertThreshold = body.alertThreshold;
  if (typeof body.name === "string") updates.name = body.name;

  await connectDB();
  const location = await Location.findOneAndUpdate(
    { _id: params.id, userId },
    { $set: updates },
    { new: true }
  );

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json(location);
}
