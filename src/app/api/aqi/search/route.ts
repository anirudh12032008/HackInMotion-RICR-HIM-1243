import { NextResponse } from "next/server";
import { searchPlaces, GoogleAqiError } from "@/lib/google-aqi";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Public by design — the landing-page search has to work before signup — so it is capped
// per IP instead of auth-gated. Proxies Google's paid Places API, and typeahead fires
// often, hence the higher ceiling than the AQI lookup.
export async function GET(req: Request) {
  if (!rateLimit(`aqi-search:${getClientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  try {
    const results = await searchPlaces(q.trim());
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof GoogleAqiError ? err.message : "Failed to search locations";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
