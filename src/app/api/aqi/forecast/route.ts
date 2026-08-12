import { NextResponse } from "next/server";
import { getForecast, WaqiError } from "@/lib/waqi";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");

  if (!city) {
    return NextResponse.json({ error: "city is required" }, { status: 400 });
  }

  try {
    const daily = await getForecast(city);
    return NextResponse.json({ forecast: daily });
  } catch (err) {
    const message = err instanceof WaqiError ? err.message : "Failed to fetch forecast";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
