import { NextResponse } from "next/server";
import { getCurrentAQI, getCurrentAQIByCoords, extractPollutants, WaqiError } from "@/lib/waqi";
import { classifyRisk } from "@/lib/risk-engine";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!city && !(lat && lng)) {
    return NextResponse.json({ error: "Provide either city or lat/lng" }, { status: 400 });
  }

  try {
    const feed = city
      ? await getCurrentAQI(city)
      : await getCurrentAQIByCoords(Number(lat), Number(lng));

    return NextResponse.json({
      aqi: feed.aqi,
      dominantPollutant: feed.dominentpol,
      city: feed.city,
      updatedAt: feed.time.s,
      pollutants: extractPollutants(feed.iaqi),
      forecast: feed.forecast?.daily ?? null,
      risk: classifyRisk(feed.aqi),
    });
  } catch (err) {
    const message = err instanceof WaqiError ? err.message : "Failed to fetch air quality data";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
