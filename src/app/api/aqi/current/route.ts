import { NextResponse } from "next/server";
import {
  geocodeCity,
  getCurrentConditions,
  getHourlyForecast,
  groupForecastByDay,
  GoogleAqiError,
} from "@/lib/google-aqi";
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
    const place = city ? await geocodeCity(city) : null;
    const targetLat = place ? place.lat : Number(lat);
    const targetLng = place ? place.lng : Number(lng);

    const [conditions, hourly] = await Promise.all([
      getCurrentConditions(targetLat, targetLng),
      getHourlyForecast(targetLat, targetLng).catch(() => []),
    ]);

    return NextResponse.json({
      aqi: conditions.aqi,
      dominantPollutant: conditions.dominantPollutant,
      city: { name: place?.name ?? `${targetLat.toFixed(3)}, ${targetLng.toFixed(3)}`, geo: [targetLat, targetLng] },
      updatedAt: conditions.timestamp,
      pollutants: conditions.pollutants,
      forecast: { daily: { pm25: groupForecastByDay(hourly) } },
      risk: classifyRisk(conditions.aqi),
    });
  } catch (err) {
    const message = err instanceof GoogleAqiError ? err.message : "Failed to fetch air quality data";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
