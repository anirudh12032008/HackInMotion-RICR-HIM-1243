import { NextResponse } from "next/server";
import { isAxiosError } from "axios";
import { requireUserId } from "@/lib/session";
import { askGroq, GroqError, type ChatMessage } from "@/lib/groq";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Location from "@/models/Location";
import { getCurrentConditions, reverseGeocode } from "@/lib/google-aqi";
import { classifyRisk } from "@/lib/risk-engine";

const MAX_HISTORY = 10;
const MAX_MESSAGE_LENGTH = 500;

interface AqiContext {
  cityName: string;
  aqi: number;
  riskLabel: string;
  dominantPollutant: string;
  pollutants: Record<string, number | undefined>;
}

interface SavedLocationSummary {
  name: string;
  city?: string;
}

function buildSystemInstruction(
  context: AqiContext | null,
  userName: string | undefined,
  healthProfile: unknown,
  savedLocations: SavedLocationSummary[]
) {
  const profile = JSON.stringify(healthProfile ?? { conditions: [], ageGroup: "adult", activityLevel: "moderate" });

  const contextLine = context
    ? `Current air quality at ${context.cityName}: AQI ${context.aqi} (${context.riskLabel}), dominant pollutant ${context.dominantPollutant}. Pollutant levels: ${JSON.stringify(context.pollutants)}.`
    : "No specific location's air quality is loaded right now — ask the user which city they'd like guidance for, or suggest one of their saved locations below.";

  const savedLocationsLine =
    savedLocations.length > 0
      ? `Their saved locations: ${savedLocations.map((l) => l.name).join(", ")}.`
      : "They haven't saved any locations yet.";

  return `You are BreatheSafe's AI air quality assistant, talking with ${userName ?? "a user"}. You give short, direct, practical answers about air quality, health effects of pollution, and what someone should do given current conditions. You are not a doctor — for medical emergencies, tell the user to seek real medical care.

${contextLine}
${savedLocationsLine}
The user's health profile: ${profile}

Keep answers to 2-4 sentences unless the user asks for more detail. Be warm but concise, like a knowledgeable friend, not a corporate chatbot. Reference the actual AQI number and pollutant when relevant. Address the user by name occasionally, not every message.`;
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
    Location.find({ userId, isActive: true }).select("name city").limit(10).lean(),
  ]);

  // If the client didn't already have a searched location's AQI loaded,
  // fall back to the browser's geolocation coords so the assistant still
  // has real, live context instead of asking "which city?" every time.
  let liveContext = context ?? null;
  if (!liveContext && coords) {
    try {
      const conditions = await getCurrentConditions(coords.lat, coords.lng);
      const placeName = (await reverseGeocode(coords.lat, coords.lng).catch(() => null)) ?? "your location";
      liveContext = {
        cityName: placeName,
        aqi: conditions.aqi,
        riskLabel: classifyRisk(conditions.aqi).label,
        dominantPollutant: conditions.dominantPollutant,
        pollutants: conditions.pollutants as Record<string, number | undefined>,
      };
    } catch {
      // No AQI station nearby, or Google call failed — assistant just
      // proceeds without live location context.
    }
  }

  const trimmedHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];
  const systemInstruction = buildSystemInstruction(
    liveContext,
    user?.name,
    user?.healthProfile,
    savedLocations as SavedLocationSummary[]
  );

  try {
    const reply = await askGroq(systemInstruction, [
      ...trimmedHistory,
      { role: "user", text: message },
    ]);
    return NextResponse.json({ reply });
  } catch (err) {
    const detail = isAxiosError(err) ? JSON.stringify(err.response?.data) : String(err);
    console.error("Groq chat failed:", detail);
    const errorMessage = err instanceof GroqError ? err.message : "The AI assistant is unavailable right now";
    return NextResponse.json({ error: errorMessage }, { status: 502 });
  }
}
