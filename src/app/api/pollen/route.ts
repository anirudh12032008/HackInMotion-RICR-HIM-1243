import { NextResponse } from "next/server";
import { getPollenForecast, GooglePollenError } from "@/lib/google-pollen";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    const types = await getPollenForecast(lat, lng);
    return NextResponse.json({ types });
  } catch (err) {
    const message = err instanceof GooglePollenError ? err.message : "Failed to fetch pollen forecast";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
