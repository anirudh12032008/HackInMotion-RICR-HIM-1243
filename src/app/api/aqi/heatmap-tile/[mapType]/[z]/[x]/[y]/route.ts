import { heatmapTileUrl } from "@/lib/google-aqi";

/**
 * Proxies Google's AQI heatmap tiles so the API key (GOOGLE_API_KEY) never
 * reaches the browser  the Maps JS overlay requests tiles from this route
 * instead of Google's endpoint directly.
 */
export async function GET(
  _req: Request,
  { params }: { params: { mapType: string; z: string; x: string; y: string } }
) {
  const url = heatmapTileUrl(params.mapType, Number(params.z), Number(params.x), Number(params.y));
  const res = await fetch(url);

  if (!res.ok) {
    return new Response(null, { status: res.status });
  }

  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
