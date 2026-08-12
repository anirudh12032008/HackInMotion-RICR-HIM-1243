import { NextResponse } from "next/server";
import { searchCity, WaqiError } from "@/lib/waqi";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  try {
    const results = await searchCity(q.trim());
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof WaqiError ? err.message : "Failed to search locations";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
