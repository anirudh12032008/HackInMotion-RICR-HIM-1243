import { NextResponse } from "next/server";
import { isAxiosError } from "axios";
import { requireUserId } from "@/lib/session";
import { askGroq, GroqError, type ChatMessage } from "@/lib/groq";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Location from "@/models/Location";
import { getCurrentConditions, geocodeCity, reverseGeocode } from "@/lib/google-aqi";
import { classifyRisk } from "@/lib/risk-engine";

const MAX_HISTORY = 10;
const MAX_MESSAGE_LENGTH = 500;

/**
 * `context` and `history` arrive from the browser, and every field of `context` is
 * interpolated into the *system* prompt. Trusting them as-is would let a caller write
 * their own instructions into the model's system message (prompt injection), or plant a
 * fake AQI reading the assistant would then repeat as authoritative health advice.
 *
 * So client-supplied context is treated as untrusted input: shapes are checked, strings
 * are length-capped, and newlines are stripped — a newline is what lets injected text
 * escape its sentence and read as its own instruction line. Anything malformed is dropped
 * whole rather than patched, and the route falls back to server-fetched data.
 *
 * This guards the assistant only. Health guidance in the UI never passes through an LLM —
 * it comes from the deterministic rules engine in risk-engine.ts.
 */
function sanitizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, maxLength);
  return cleaned.length > 0 ? cleaned : null;
}

function sanitizeContext(value: unknown): AqiContext | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  const cityName = sanitizeText(raw.cityName, 80);
  const riskLabel = sanitizeText(raw.riskLabel, 40);
  const dominantPollutant = sanitizeText(raw.dominantPollutant, 20);
  const aqi = typeof raw.aqi === "number" && Number.isFinite(raw.aqi) ? raw.aqi : null;
  if (!cityName || !riskLabel || !dominantPollutant || aqi === null) return null;

  // Keep only numeric readings; a string here would reach the prompt verbatim.
  const pollutants: Record<string, number> = {};
  if (raw.pollutants && typeof raw.pollutants === "object") {
    for (const [key, reading] of Object.entries(raw.pollutants as Record<string, unknown>)) {
      if (typeof reading === "number" && Number.isFinite(reading)) {
        pollutants[key.slice(0, 12)] = reading;
      }
    }
  }

  return { cityName, aqi, riskLabel, dominantPollutant, pollutants };
}

function sanitizeHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-MAX_HISTORY)
    .map((entry) => {
      const raw = entry as Record<string, unknown>;
      const text = sanitizeText(raw?.text, MAX_MESSAGE_LENGTH);
      // Only the two roles the model expects — an arbitrary role string would let a
      // caller forge a "system" turn inside the conversation.
      const role = raw?.role === "assistant" ? "assistant" : "user";
      return text ? ({ role, text } as ChatMessage) : null;
    })
    .filter((entry): entry is ChatMessage => entry !== null);
}

interface AqiContext {
  cityName: string;
  aqi: number;
  riskLabel: string;
  dominantPollutant: string;
  pollutants: Record<string, number | undefined>;
}

interface SavedLocationSummary {
  _id: string;
  name: string;
  city?: string;
  lat: number;
  lng: number;
}

function buildSystemInstruction(
  context: AqiContext | null,
  userName: string | undefined,
  healthProfile: unknown,
  savedLocations: SavedLocationSummary[]
) {
  const profile = JSON.stringify(
    healthProfile ?? { conditions: [], ageGroup: "adult", activityLevel: "moderate" }
  );

  const contextLine = context
    ? `Current air quality at ${context.cityName}: AQI ${context.aqi} (${context.riskLabel}), dominant pollutant ${context.dominantPollutant}. Pollutant levels: ${JSON.stringify(context.pollutants)}.`
    : "No specific location's air quality is loaded right now  ask the user which city they'd like guidance for, or suggest one of their saved locations below.";

  const savedLocationsLine =
    savedLocations.length > 0
      ? `Their saved locations: ${savedLocations.map((l) => l.name).join(", ")}.`
      : "They haven't saved any locations yet.";

  return `You are BreatheSafe's AI air quality assistant, talking with ${userName ?? "a user"}. You give short, direct, practical answers about air quality, health effects of pollution, and what someone should do given current conditions. You are not a doctor  for medical emergencies, tell the user to seek real medical care.

${contextLine}
${savedLocationsLine}
The user's health profile: ${profile}

Keep answers to 2-4 sentences unless the user asks for more detail. Be warm but concise, like a knowledgeable friend, not a corporate chatbot. Reference the actual AQI number and pollutant when relevant. Address the user by name occasionally, not every message. Never say you'll "try to find" or "simulate" data  if air quality data is given to you above, use it directly; if none is given, just ask for a location.`;
}

async function conditionsToContext(lat: number, lng: number, name: string): Promise<AqiContext> {
  const conditions = await getCurrentConditions(lat, lng);
  return {
    cityName: name,
    aqi: conditions.aqi,
    riskLabel: classifyRisk(conditions.aqi).label,
    dominantPollutant: conditions.dominantPollutant,
    pollutants: conditions.pollutants as Record<string, number | undefined>,
  };
}

/** Looks for a saved location named in the message, then falls back to geocoding the message itself as a place name. */
async function resolveLocationFromMessage(
  message: string,
  savedLocations: SavedLocationSummary[]
): Promise<AqiContext | null> {
  const lower = message.toLowerCase();
  const matched = savedLocations.find(
    (loc) =>
      lower.includes(loc.name.toLowerCase()) || (loc.city && lower.includes(loc.city.toLowerCase()))
  );
  if (matched) {
    try {
      return await conditionsToContext(matched.lat, matched.lng, matched.name);
    } catch {
      return null;
    }
  }

  // Short messages are often just a place name ("bhopal", "what about Delhi?") —
  // try geocoding the raw text directly rather than requiring an exact match.
  if (message.trim().length > 0 && message.trim().length <= 60) {
    try {
      const place = await geocodeCity(message.trim());
      return await conditionsToContext(place.lat, place.lng, place.name);
    } catch {
      return null;
    }
  }

  return null;
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { message, history, context, coords } = body as {
    message: string;
    history: ChatMessage[];
    context: AqiContext | null;
    coords?: { lat: number; lng: number };
  };

  if (!message || typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  await connectDB();
  const [user, savedLocations] = await Promise.all([
    User.findById(userId).select("name healthProfile"),
    Location.find({ userId, isActive: true }).select("name city lat lng").limit(10).lean(),
  ]);
  const savedLocationSummaries = savedLocations.map((l) => ({
    _id: l._id.toString(),
    name: l.name,
    city: l.city,
    lat: l.lat,
    lng: l.lng,
  }));

  // A location named in *this* message always wins, even if a city is
  // already loaded client-side  otherwise the stale `context` from an
  // earlier search silently overrides every new city the user types.
  let liveContext = await resolveLocationFromMessage(message, savedLocationSummaries);
  if (!liveContext) {
    // Server-resolved context is preferred; the client's is only a fallback, and only
    // after sanitizing — see sanitizeContext above for why it can't be trusted raw.
    liveContext = sanitizeContext(context);
  }
  if (!liveContext && coords) {
    try {
      const placeName =
        (await reverseGeocode(coords.lat, coords.lng).catch(() => null)) ?? "your location";
      liveContext = await conditionsToContext(coords.lat, coords.lng, placeName);
    } catch {
      // No AQI station nearby, or Google call failed  assistant just
      // proceeds without live location context.
    }
  }

  const trimmedHistory = sanitizeHistory(history);
  const systemInstruction = buildSystemInstruction(
    liveContext,
    user?.name,
    user?.healthProfile,
    savedLocationSummaries
  );

  try {
    const reply = await askGroq(systemInstruction, [
      ...trimmedHistory,
      { role: "user", text: message },
    ]);
    return NextResponse.json({ reply, resolvedContext: liveContext });
  } catch (err) {
    const detail = isAxiosError(err) ? JSON.stringify(err.response?.data) : String(err);
    console.error("Groq chat failed:", detail);
    const errorMessage =
      err instanceof GroqError ? err.message : "The AI assistant is unavailable right now";
    return NextResponse.json({ error: errorMessage }, { status: 502 });
  }
}
