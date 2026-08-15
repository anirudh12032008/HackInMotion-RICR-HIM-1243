import { NextResponse } from "next/server";
import {
  geocodeCity,
  getHourlyForecast,
  groupForecastByDay,
  GoogleAqiError,
} from "@/lib/google-aqi";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");

  if (!city) {
    return NextResponse.json({ error: "city is required" }, { status: 400 });
  }

  try {
    const place = await geocodeCity(city);
    const hourly = await getHourlyForecast(place.lat, place.lng);
    return NextResponse.json({ forecast: { pm25: groupForecastByDay(hourly) } });
  } catch (err) {
    const message = err instanceof GoogleAqiError ? err.message : "Failed to fetch forecast";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
