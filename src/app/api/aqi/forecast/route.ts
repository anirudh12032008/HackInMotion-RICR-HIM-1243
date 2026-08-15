import { NextResponse } from "next/server";
import {
  geocodeCity,
  getHourlyForecast,
  groupForecastByDay,
  GoogleAqiError,
} from "@/lib/google-aqi";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Same reasoning as /api/aqi/current: public so the pre-login demo works, capped per IP
// because each call fans out to two paid Google endpoints (geocode + 48h forecast).
export async function GET(req: Request) {
  if (!rateLimit(`aqi-forecast:${getClientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

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
