import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { askGemini, GeminiError, type ChatMessage } from "@/lib/gemini";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const MAX_HISTORY = 10;
const MAX_MESSAGE_LENGTH = 500;

interface AqiContext {
  cityName: string;
  aqi: number;
  riskLabel: string;
  dominantPollutant: string;
  pollutants: Record<string, number | undefined>;
}

function buildSystemInstruction(context: AqiContext | null, healthProfile: unknown) {
  const profile = JSON.stringify(healthProfile ?? { conditions: [], ageGroup: "adult", activityLevel: "moderate" });

  const contextLine = context
    ? `Current air quality at ${context.cityName}: AQI ${context.aqi} (${context.riskLabel}), dominant pollutant ${context.dominantPollutant}. Pollutant levels: ${JSON.stringify(context.pollutants)}.`
    : "No specific location is currently loaded — ask the user which city they'd like air quality guidance for.";

  return `You are BreatheSafe's AI air quality assistant. You give short, direct, practical answers about air quality, health effects of pollution, and what someone should do given current conditions. You are not a doctor — for medical emergencies, tell the user to seek real medical care.

${contextLine}
The user's health profile: ${profile}

Keep answers to 2-4 sentences unless the user asks for more detail. Be warm but concise, like a knowledgeable friend, not a corporate chatbot. Reference the actual AQI number and pollutant when relevant.`;
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { message, history, context } = body as {
    message: string;
    history: ChatMessage[];
    context: AqiContext | null;
  };

  if (!message || typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(userId).select("healthProfile");

  const trimmedHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];
  const systemInstruction = buildSystemInstruction(context ?? null, user?.healthProfile);

  try {
    const reply = await askGemini(systemInstruction, [
      ...trimmedHistory,
      { role: "user", text: message },
    ]);
    return NextResponse.json({ reply });
  } catch (err) {
    const errorMessage = err instanceof GeminiError ? err.message : "The AI assistant is unavailable right now";
    return NextResponse.json({ error: errorMessage }, { status: 502 });
  }
}
