import { heatmapTileUrl } from "@/lib/google-aqi";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Proxies Google's AQI heatmap tiles so the API key (GOOGLE_API_KEY) never
 * reaches the browser  the Maps JS overlay requests tiles from this route
 * instead of Google's endpoint directly.
 *
 * Security: rate-limited per IP (see @/lib/rate-limit) since this route is
 * public and could otherwise be hammered to burn the Google API quota/key.
 */
export async function GET(
  req: Request,
  { params }: { params: { mapType: string; z: string; x: string; y: string } }
) {
  if (!rateLimit(`heatmap-tile:${getClientIp(req)}`, 300, 60_000)) {
    return new Response(null, { status: 429 });
  }

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
