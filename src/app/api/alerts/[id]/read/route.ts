import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Alert from "@/models/Alert";
import { requireUserId } from "@/lib/session";

export async function PUT(_req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const alert = await Alert.findOneAndUpdate(
    { _id: params.id, userId },
    { $set: { read: true } },
    { new: true }
  );

  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  return NextResponse.json(alert);
}
