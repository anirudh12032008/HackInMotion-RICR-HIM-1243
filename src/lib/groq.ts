import axios from "axios";

const API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export class GroqError extends Error {}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export async function askGroq(systemInstruction: string, history: ChatMessage[]): Promise<string> {
  if (!API_KEY) throw new GroqError("Missing GROQ_API_KEY environment variable");

  const { data } = await axios.post(
    GROQ_BASE,
    {
      model: MODEL,
      messages: [
        { role: "system", content: systemInstruction },
        ...history.map((m) => ({
          role: m.role === "model" ? "assistant" : "user",
          content: m.text,
        })),
      ],
      temperature: 0.6,
      max_tokens: 400,
    },
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  );

  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new GroqError("Groq returned an empty response");
  return text;
}
