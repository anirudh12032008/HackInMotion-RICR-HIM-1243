import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { getDirections, GoogleDirectionsError } from "@/lib/google-directions";

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { start, end, mode } = await req.json();
  if (!start || !end) {
    return NextResponse.json({ error: "start and end are required" }, { status: 400 });
  }

  try {
    const directions = await getDirections(start, end, mode);
    return NextResponse.json(directions);
  } catch (err) {
    const message = err instanceof GoogleDirectionsError ? err.message : "Failed to fetch directions";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
