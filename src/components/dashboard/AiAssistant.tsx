"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { classifyRisk } from "@/lib/risk-engine";
import type { AqiResult } from "@/components/dashboard/QuickSearch";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "model";
  text: string;
}

const SUGGESTIONS = [
  "Should I go for a run today?",
  "What mask should I wear?",
  "Is it safe to open my windows?",
];

export function AiAssistant({ result }: { result: AqiResult | null }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvedCity, setResolvedCity] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Best-effort, silent  gives the assistant real location context as a
  // fallback even after a city has been searched, since a later message
  // might ask about "my location" rather than the currently displayed
  // city. No prompt/error shown if it's unavailable or denied; the
  // assistant just asks the user instead.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 }
    );
  }, []);

  async function send(text: string) {
    if (!text.trim() || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
          context: result
            ? {
                cityName: result.city.name,
                aqi: result.aqi,
                riskLabel: classifyRisk(result.aqi).label,
                dominantPollutant: result.dominantPollutant,
                pollutants: result.pollutants,
              }
            : null,
          coords,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setMessages([...nextMessages, { role: "model", text: data.reply }]);
      if (data.resolvedContext?.cityName) setResolvedCity(data.resolvedContext.cityName);
    } catch (err) {
      setMessages([
        ...nextMessages,
        {
          role: "model",
          text: err instanceof Error ? `Sorry  ${err.message}` : "Sorry, something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size="icon"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </Button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[28rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Bot className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">BreatheSafe AI</p>
              <p className="text-[11px] text-muted-foreground">
                {result
                  ? `Knows about ${result.city.name}`
                  : resolvedCity
                    ? `Knows about ${resolvedCity}`
                    : coords
                      ? "Knows your current location"
                      : "Ask me anything about air quality"}
              </p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Try asking:</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {m.text}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your air..."
              className="h-9 text-sm"
              disabled={loading}
            />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
