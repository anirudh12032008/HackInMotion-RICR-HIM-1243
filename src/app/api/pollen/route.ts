import { NextResponse } from "next/server";
import { isAxiosError } from "axios";
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
    // Google's Pollen API has limited regional coverage (no India, for
    // example) — that's an expected, non-actionable gap, not a real error,
    // so return an empty result quietly instead of logging/502ing.
    if (isAxiosError(err) && err.response?.data?.error?.message?.includes("unavailable for this location")) {
      return NextResponse.json({ types: [] });
    }

    const detail = isAxiosError(err) ? JSON.stringify(err.response?.data) : String(err);
    console.error("Pollen fetch failed:", detail);
    const message = err instanceof GooglePollenError ? err.message : "Failed to fetch pollen forecast";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
