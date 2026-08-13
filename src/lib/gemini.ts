import axios from "axios";

const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// "-latest" aliases auto-update to Google's current recommended model with
// a 2-week deprecation notice, instead of a hardcoded version that silently
// stops working when Google retires it (as gemini-2.0-flash and
// gemini-2.5-flash both did within this session).
const MODEL = "gemini-flash-latest";

export class GeminiError extends Error {}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export async function askGemini(systemInstruction: string, history: ChatMessage[]): Promise<string> {
  if (!API_KEY) throw new GeminiError("Missing GEMINI_API_KEY environment variable");

  const { data } = await axios.post(
    `${GEMINI_BASE}/${MODEL}:generateContent`,
    {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 400,
      },
    },
    { params: { key: API_KEY } }
  );

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiError("Gemini returned an empty response");
  return text;
}
